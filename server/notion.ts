import { Client } from "@notionhq/client";

// Initialize Notion client
export const notion = new Client({
    auth: process.env.NOTION_INTEGRATION_SECRET!,
});

// Extract the page ID from the Notion page URL
function extractPageIdFromUrl(pageUrl: string): string {
    const match = pageUrl.match(/([a-f0-9]{32})(?:[?#]|$)/i);
    if (match && match[1]) {
        return match[1];
    }

    throw Error("Failed to extract page ID");
}

export const NOTION_PAGE_ID = extractPageIdFromUrl(process.env.NOTION_PAGE_URL!);

/**
 * Lists all child databases contained within NOTION_PAGE_ID
 * @returns {Promise<Array<{id: string, title: string}>>} - Array of database objects with id and title
 */
export async function getNotionDatabases() {

    // Array to store the child databases
    const childDatabases = [];

    try {
        // Query all child blocks in the specified page
        let hasMore = true;
        let startCursor: string | undefined = undefined;

        while (hasMore) {
            const response = await notion.blocks.children.list({
                block_id: NOTION_PAGE_ID,
                start_cursor: startCursor,
            });

            // Process the results
            for (const block of response.results) {
                // Check if the block is a child database
                if (block.type === "child_database") {
                    const databaseId = block.id;

                    // Retrieve the database title
                    try {
                        const databaseInfo = await notion.databases.retrieve({
                            database_id: databaseId,
                        });

                        // Add the database to our list
                        childDatabases.push(databaseInfo);
                    } catch (error) {
                        console.error(`Error retrieving database ${databaseId}:`, error);
                    }
                }
            }

            // Check if there are more results to fetch
            hasMore = response.has_more;
            startCursor = response.next_cursor || undefined;
        }

        return childDatabases;
    } catch (error) {
        console.error("Error listing child databases:", error);
        throw error;
    }
}

// Find get a Notion database with the matching title
export async function findDatabaseByTitle(title: string) {
    const databases = await getNotionDatabases();

    for (const db of databases) {
        if (db.title && Array.isArray(db.title) && db.title.length > 0) {
            const dbTitle = db.title[0]?.plain_text?.toLowerCase() || "";
            if (dbTitle === title.toLowerCase()) {
                return db;
            }
        }
    }

    return null;
}

// Create a new database if one with a matching title does not exist
export async function createDatabaseIfNotExists(title, properties) {
    const existingDb = await findDatabaseByTitle(title);
    if (existingDb) {
        return existingDb;
    }
    return await notion.databases.create({
        parent: {
            type: "page_id",
            page_id: NOTION_PAGE_ID
        },
        title: [
            {
                type: "text",
                text: {
                    content: title
                }
            }
        ],
        properties
    });
}


// Get all tasks from the Notion database using your existing structure
export async function getTasks(tasksDatabaseId: string) {
    try {
        const response = await notion.databases.query({
            database_id: tasksDatabaseId,
        });

        return response.results.map((page: any) => {
            const properties = page.properties;

            const dueDate = properties.Due?.date?.start
                ? new Date(properties.Due.date.start)
                : null;

            // Extract duration from "Min to Complete" field
            const duration = properties["Min to Complete"]?.number || 30;

            // Calculate gold value based on importance and duration
            const importance = properties.Importance?.select?.name || "Medium";
            const goldValue = calculateGoldValue(importance, duration);

            // Check if task is completed based on Kanban stage
            const kanbanStage = properties["Kanban - Stage"]?.status?.name || "Not Started";
            const isCompleted = kanbanStage === "Done";

            const completedAt = isCompleted ? new Date() : null;

            return {
                notionId: page.id,
                title: properties.Task?.title?.[0]?.plain_text || "Untitled Task",
                description: properties.Details?.rich_text?.[0]?.plain_text || "",
                duration,
                goldValue,
                isCompleted,
                dueDate,
                completedAt,
                importance,
                kanbanStage,
                recurType: properties["Recur Type"]?.select?.name || "⏳One-Time",
                lifeDomain: properties["Life Domain"]?.select?.name || "General",
                apple: properties.Apple?.checkbox || false,
                smartPrep: properties.SmartPrep?.checkbox || false,
                delegationTask: properties["Delegation Task"]?.checkbox || false,
                velin: properties.Velin?.checkbox || false,
            };
        });
    } catch (error: any) {
        console.error("Error fetching tasks from Notion:", error);
        
        // Provide more specific error messages
        if (error.code === 'object_not_found') {
            throw new Error(`Database not found. Please check: 1) Database ID is correct, 2) Database is shared with your integration, 3) You have the right permissions`);
        } else if (error.code === 'unauthorized') {
            throw new Error(`Unauthorized access. Please check your Notion API key and make sure your integration has access to the database.`);
        } else if (error.code === 'validation_error') {
            throw new Error(`Invalid database ID format. Please make sure you copied the correct 32-character database ID from your Notion URL.`);
        } else {
            throw new Error(`Failed to fetch tasks from Notion: ${error.message || 'Unknown error'}`);
        }
    }
}

// Calculate gold value based on importance and duration
function calculateGoldValue(importance: string, duration: number): number {
    const baseGold = Math.ceil(duration / 10); // 1 gold per 10 minutes
    
    const importanceMultiplier = {
        "Low": 1,
        "Med-Low": 1.2,
        "Medium": 1.5,
        "Med-High": 2,
        "High": 2.5,
        "Pareto": 3
    };
    
    const multiplier = importanceMultiplier[importance as keyof typeof importanceMultiplier] || 1.5;
    return Math.round(baseGold * multiplier);
}

// Update a task's completion status in Notion by changing Kanban stage
export async function updateTaskCompletion(notionId: string, completed: boolean) {
    try {
        await notion.pages.update({
            page_id: notionId,
            properties: {
                "Kanban - Stage": {
                    status: {
                        name: completed ? "Done" : "In Progress"
                    }
                }
            },
        });
    } catch (error) {
        console.error("Error updating task completion in Notion:", error);
        throw new Error("Failed to update task in Notion");
    }
}