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


// Format database ID to include dashes if missing
function formatDatabaseId(databaseId: string): string {
    // Remove any existing dashes and ensure we have a 32-character string
    const cleanId = databaseId.replace(/-/g, '');
    if (cleanId.length !== 32) {
        throw new Error(`Invalid database ID format. Expected 32 characters, got ${cleanId.length}`);
    }
    
    // Add dashes in the correct positions: 8-4-4-4-12
    return `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20)}`;
}

// Get all tasks from the Notion database using user-specific API key
export async function getTasks(tasksDatabaseId: string, userApiKey: string) {
    try {
        // Create user-specific Notion client
        const userNotion = new Client({
            auth: userApiKey,
        });

        // Format the database ID properly
        const formattedDatabaseId = formatDatabaseId(tasksDatabaseId);
        console.log(`Querying Notion database: ${formattedDatabaseId}`);

        const response = await userNotion.databases.query({
            database_id: formattedDatabaseId,
        });

        return response.results.map((page: any) => {
            const properties = page.properties;

            // Extract due date from "Due" property (Date type)
            const dueDate = properties.Due?.date?.start
                ? new Date(properties.Due.date.start)
                : null;

            // Default duration to 30 minutes (can be customized later)
            const duration = 30;

            // Extract importance from "Importance" property (Select type)
            // Options: Pareto, High, Med-High, Medium, Med-Low, Low
            const importance = properties.Importance?.select?.name || "Medium";
            
            // Calculate gold value based on importance and duration
            const goldValue = calculateGoldValue(importance, duration);

            // Extract Kanban stage from "Kanban - Stage" property (Status type)
            // Options: Not Started (To-Do), In Progress, Incubate (In progress), Done (Complete)
            const kanbanStage = properties["Kanban - Stage"]?.status?.name || "Not Started";
            const isCompleted = kanbanStage === "Done";

            const completedAt = isCompleted ? new Date() : null;

            // Extract recurrence from "Recur Type" property (Select type)
            // Options: one-time, daily, every other day, 2x week, 3x week, weekly, 2x month, monthly, every 2 months, quarterly, every 6 months, yearly
            const recurType = properties["Recur Type"]?.select?.name || "one-time";

            // Extract details from "Details" property (Text type)
            const details = properties.Details?.rich_text?.[0]?.plain_text || "";

            return {
                notionId: page.id,
                title: properties.Task?.title?.[0]?.plain_text || "Untitled Task",
                description: "", // Can be added later if needed
                details,
                duration,
                goldValue,
                isCompleted,
                dueDate,
                completedAt,
                importance,
                kanbanStage,
                recurType,
                lifeDomain: "General", // Default value
                apple: false,
                smartPrep: false,
                delegationTask: false,
                velin: false,
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
export async function updateTaskCompletion(notionId: string, completed: boolean, userApiKey: string) {
    try {
        // Create user-specific Notion client
        const userNotion = new Client({
            auth: userApiKey,
        });

        // Format the notion ID properly
        const formattedNotionId = formatDatabaseId(notionId);

        await userNotion.pages.update({
            page_id: formattedNotionId,
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

// Add a task to Notion database
export async function addTaskToNotion(task: any, databaseId: string, userApiKey: string) {
    try {
        const userNotion = new Client({
            auth: userApiKey,
        });

        // Format the database ID properly
        const formattedDatabaseId = formatDatabaseId(databaseId);

        const response = await userNotion.pages.create({
            parent: {
                database_id: formattedDatabaseId,
            },
            properties: {
                // Required: Task (Name/Title)
                "Task": {
                    title: [
                        {
                            text: {
                                content: task.title,
                            },
                        },
                    ],
                },
                // Required: Due (Date)
                "Due": task.dueDate ? {
                    date: {
                        start: task.dueDate,
                    },
                } : undefined,
                // Required: Importance (Select)
                // Options: Pareto, High, Med-High, Medium, Med-Low, Low
                "Importance": {
                    select: {
                        name: task.importance || "Medium",
                    },
                },
                // Required: Kanban - Stage (Status)
                // Options: Not Started, In Progress, Incubate, Done
                "Kanban - Stage": {
                    status: {
                        name: task.completed ? "Done" : "Not Started",
                    },
                },
                // Required: Recur Type (Select)
                // Options: one-time, daily, every other day, 2x week, 3x week, weekly, 2x month, monthly, every 2 months, quarterly, every 6 months, yearly
                "Recur Type": {
                    select: {
                        name: task.recurType || "one-time",
                    },
                },
            },
        });

        return response.id;
    } catch (error) {
        console.error("Error adding task to Notion:", error);
        throw new Error("Failed to add task to Notion");
    }
}

// Delete a task from Notion database
export async function deleteTaskFromNotion(notionId: string, userApiKey: string) {
    try {
        const userNotion = new Client({
            auth: userApiKey,
        });

        // Format the notion ID properly
        const formattedNotionId = formatDatabaseId(notionId);

        await userNotion.pages.update({
            page_id: formattedNotionId,
            archived: true,
        });
    } catch (error) {
        console.error("Error deleting task from Notion:", error);
        throw new Error("Failed to delete task from Notion");
    }
}