import { createDatabaseIfNotExists, findDatabaseByTitle, notion } from "./notion";

// Environment variables validation
if (!process.env.NOTION_INTEGRATION_SECRET) {
    throw new Error("NOTION_INTEGRATION_SECRET is not defined. Please add it to your environment variables.");
}

// Setup function to create a database matching the user's existing structure
async function setupNotionDatabases() {
    console.log("Setting up Notion database for QuestList with your existing structure...");
    
    await createDatabaseIfNotExists("QuestList Tasks", {
        // Task name (primary field)
        Task: {
            title: {}
        },
        // Task details/description
        Details: {
            rich_text: {}
        },
        // Recurrence type
        "Recur Type": {
            select: {
                options: [
                    { name: "⏳One-Time", color: "blue" },
                    { name: "🔄Recurring", color: "green" }
                ]
            }
        },
        // Due date for the task
        Due: {
            date: {}
        },
        // How long to complete (in minutes)
        "Min to Complete": {
            number: {
                format: "number"
            }
        },
        // Importance level
        Importance: {
            select: {
                options: [
                    { name: "Low", color: "gray" },
                    { name: "Med-Low", color: "brown" },
                    { name: "Medium", color: "orange" },
                    { name: "Med-High", color: "yellow" },
                    { name: "High", color: "red" },
                    { name: "Pareto", color: "purple" }
                ]
            }
        },
        // Kanban stage
        "Kanban - Stage": {
            status: {
                options: [
                    { name: "Incubate", color: "gray" },
                    { name: "Not Started", color: "red" },
                    { name: "In Progress", color: "yellow" },
                    { name: "Done", color: "green" }
                ]
            }
        }
    });

    console.log("Database setup complete!");
}

async function createSampleTasks() {
    try {
        console.log("Adding sample tasks...");

        // Find the tasks database
        const tasksDb = await findDatabaseByTitle("QuestList Tasks");

        if (!tasksDb) {
            throw new Error("Could not find the QuestList Tasks database. Please run the setup first.");
        }

        const sampleTasks = [
            {
                title: "Water the lawn",
                details: "Water the front and back lawn areas. Check sprinkler system.",
                duration: 30,
                importance: "Medium",
                recurType: "🔄Recurring",
                dueDate: "2024-03-03"
            },
            {
                title: "Complete weekly report",
                details: "Finish the weekly progress report for the project team.",
                duration: 60,
                importance: "High",
                recurType: "🔄Recurring",
                dueDate: "2024-03-05"
            },
            {
                title: "Grocery shopping",
                details: "Buy ingredients for dinner this week. Check the shopping list.",
                duration: 45,
                importance: "Med-High",
                recurType: "🔄Recurring",
                dueDate: "2024-03-02"
            },
            {
                title: "Exercise routine",
                details: "Complete 30-minute workout routine. Focus on cardio and strength training.",
                duration: 30,
                importance: "Pareto",
                recurType: "🔄Recurring",
                dueDate: "2024-03-01"
            },
            {
                title: "Read chapter 5",
                details: "Read and take notes on chapter 5 of the programming book.",
                duration: 90,
                importance: "Med-Low",
                recurType: "⏳One-Time",
                dueDate: "2024-03-04"
            }
        ];

        for (let task of sampleTasks) {
            await notion.pages.create({
                parent: {
                    database_id: tasksDb.id
                },
                properties: {
                    Task: {
                        title: [
                            {
                                text: {
                                    content: task.title
                                }
                            }
                        ]
                    },
                    Details: {
                        rich_text: [
                            {
                                text: {
                                    content: task.details
                                }
                            }
                        ]
                    },
                    "Recur Type": {
                        select: {
                            name: task.recurType
                        }
                    },
                    Due: {
                        date: {
                            start: task.dueDate
                        }
                    },
                    "Min to Complete": {
                        number: task.duration
                    },
                    Importance: {
                        select: {
                            name: task.importance
                        }
                    },
                    "Kanban - Stage": {
                        status: {
                            name: "Not Started"
                        }
                    }
                }
            });

            console.log(`Created task: ${task.title}`);
        }

        console.log("Sample tasks creation complete!");
    } catch (error) {
        console.error("Error creating sample tasks:", error);
    }
}

// Run the setup
setupNotionDatabases().then(() => {
    return createSampleTasks();
}).then(() => {
    console.log("Setup complete! You can now sync your Notion tasks with the QuestList app.");
    process.exit(0);
}).catch(error => {
    console.error("Setup failed:", error);
    process.exit(1);
});