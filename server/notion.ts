import { Client } from "@notionhq/client";
import { calculateGoldValue } from "./goldCalculation";

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
    console.log('📥 [NOTION getTasks] Starting fetch...');
    console.log('📥 [NOTION getTasks] Database ID:', tasksDatabaseId);
    try {
        // Create user-specific Notion client
        const userNotion = new Client({
            auth: userApiKey,
        });

        // Format the database ID properly
        const formattedDatabaseId = formatDatabaseId(tasksDatabaseId);
        console.log(`📥 [NOTION getTasks] Querying Notion database: ${formattedDatabaseId}`);

        // Fetch all pages with pagination
        let allResults: any[] = [];
        let hasMore = true;
        let startCursor: string | undefined = undefined;
        let pageCount = 0;

        while (hasMore) {
            const response = await userNotion.databases.query({
                database_id: formattedDatabaseId,
                start_cursor: startCursor,
                page_size: 100, // Maximum allowed by Notion API
            });

            allResults = allResults.concat(response.results);
            hasMore = response.has_more;
            startCursor = response.next_cursor || undefined;
            pageCount++;

            console.log(`📥 [NOTION getTasks] Fetched page ${pageCount}: ${response.results.length} tasks (Total so far: ${allResults.length})`);
        }

        console.log(`📥 [NOTION getTasks] Retrieved ${allResults.length} total pages from Notion across ${pageCount} API calls`);

        return allResults.map((page: any, index: number) => {
            try {
                const properties = page.properties;
                console.log(`📥 [NOTION getTasks] Processing page ${index + 1}/${allResults.length}`);

                // Extract due date from "Due" property (Date type)
                // Notion returns dates in ISO format with timezone offset
                const dueDateRaw = properties.Due?.date?.start;
                console.log(`📥 [NOTION] Raw due date for task: ${dueDateRaw}`);
                
                let dueDate: Date | null = null;
                if (dueDateRaw) {
                    // If it's just a date (YYYY-MM-DD) without time, parse it as local date
                    // to avoid timezone conversion issues
                    if (dueDateRaw.length === 10) {
                        // Date only format: "2026-01-16"
                        // Parse as local date at noon to avoid day boundary issues
                        const [year, month, day] = dueDateRaw.split('-').map(Number);
                        dueDate = new Date(year, month - 1, day, 12, 0, 0);
                        console.log(`📥 [NOTION] Parsed date-only as local noon: ${dueDate.toISOString()}`);
                    } else {
                        // Full datetime format with timezone: "2026-01-22T04:38:00.000-08:00"
                        // JavaScript's Date constructor correctly parses ISO 8601 with timezone
                        // This will convert to UTC internally, which is what we want for storage
                        dueDate = new Date(dueDateRaw);
                        console.log(`📥 [NOTION] Parsed datetime: ${dueDate.toISOString()} (from: ${dueDateRaw})`);
                    }
                }

                // Extract duration from "Min to Complete" property (Number type)
                // Default to 30 minutes if not found or invalid
                let duration = 30;
                if (properties["Min to Complete"]?.number) {
                    duration = properties["Min to Complete"].number;
                } else if (properties["Min to complete"]?.number) {
                    // Try alternate capitalization
                    duration = properties["Min to complete"].number;
                }

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

                // Extract campaign from "Campaign" property (Select type)
                // Options: unassigned, Main, Side
                const campaign = properties.Campaign?.select?.name || "unassigned";

                // Extract Business/Work Filter from "Business/Work Filter" property (Select type)
                // Options: Apple, General, MW
                const businessWorkFilter = properties["Business/Work Filter"]?.select?.name || null;

                // Extract details from "Details" property (Text type)
                const details = properties.Details?.rich_text?.[0]?.plain_text || "";

                // Extract Google Calendar Event ID from "GCal Event ID" property (Text type)
                const googleEventId = properties["GCal Event ID"]?.rich_text?.[0]?.plain_text || null;

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
                    campaign,
                    businessWorkFilter,
                    googleEventId,
                    apple: false,
                    smartPrep: false,
                    delegationTask: false,
                    velin: false,
                };
            } catch (pageError: any) {
                console.error(`Error processing page ${index}:`, pageError.message);
                console.error('Page properties:', JSON.stringify(page.properties, null, 2));
                throw pageError;
            }
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

        // Build properties object with all available fields
        const properties: any = {
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
            // Required: Importance (Select)
            "Importance": {
                select: {
                    name: task.importance || "Medium",
                },
            },
            // Required: Kanban - Stage (Status)
            "Kanban - Stage": {
                status: {
                    name: task.completed ? "Done" : (task.kanbanStage || "Not Started"),
                },
            },
            // Required: Recur Type (Select)
            "Recur Type": {
                select: {
                    name: task.recurType || "one-time",
                },
            },
        };

        // Optional: Due Date
        if (task.dueDate) {
            properties["Due"] = {
                date: {
                    start: new Date(task.dueDate).toISOString().split('T')[0], // Format as YYYY-MM-DD
                },
            };
        }

        // Optional: Details (Rich Text)
        if (task.details) {
            properties["Details"] = {
                rich_text: [
                    {
                        text: {
                            content: task.details.substring(0, 2000), // Notion limit
                        },
                    },
                ],
            };
        }

        // Optional: Min to Complete (Number) - duration in minutes
        if (task.duration) {
            properties["Min to Complete"] = {
                number: task.duration,
            };
        }

        // Optional: Business/Work Filter (Select)
        if (task.businessWorkFilter) {
            properties["Business/Work Filter"] = {
                select: {
                    name: task.businessWorkFilter,
                },
            };
        }

        // Optional: Checkboxes - Apple
        if (task.apple !== undefined && task.apple !== null) {
            properties["Apple"] = {
                checkbox: task.apple,
            };
        }

        // Optional: Checkboxes - SmartPrep
        if (task.smartPrep !== undefined && task.smartPrep !== null) {
            properties["SmartPrep"] = {
                checkbox: task.smartPrep,
            };
        }

        // Optional: Checkboxes - Delegation Task
        if (task.delegationTask !== undefined && task.delegationTask !== null) {
            properties["Delegation Task"] = {
                checkbox: task.delegationTask,
            };
        }

        // Optional: Checkboxes - Velin
        if (task.velin !== undefined && task.velin !== null) {
            properties["Velin"] = {
                checkbox: task.velin,
            };
        }

        // Optional: GCal Event ID (Text) - Google Calendar Event ID
        if (task.googleEventId) {
            properties["GCal Event ID"] = {
                rich_text: [
                    {
                        text: {
                            content: task.googleEventId,
                        },
                    },
                ],
            };
        }

        const response = await userNotion.pages.create({
            parent: {
                database_id: formattedDatabaseId,
            },
            properties,
        });

        return response.id;
    } catch (error: any) {
        console.error("Error adding task to Notion:", error);
        // Provide more context in error message
        throw new Error(`Failed to add task "${task.title}" to Notion: ${error.message || 'Unknown error'}`);
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