import { createDatabaseIfNotExists, findDatabaseByTitle, notion } from "./notion";

// Environment variables validation
if (!process.env.NOTION_INTEGRATION_SECRET) {
    throw new Error("NOTION_INTEGRATION_SECRET is not defined. Please add it to your environment variables.");
}

// Setup function to create the QuestList Tasks database
async function setupNotionDatabases() {
    console.log("Setting up Notion database for QuestList...");
    
    await createDatabaseIfNotExists("QuestList Tasks", {
        // Task name (primary field)
        Title: {
            title: {}
        },
        // Task details/description
        "Task Details": {
            rich_text: {}
        },
        // How long to complete (in minutes)
        "Time to Complete": {
            number: {
                format: "number"
            }
        },
        // Gold earned for completing the task
        "Gold Earned": {
            number: {
                format: "number"
            }
        },
        // Due date for the task
        DueDate: {
            date: {}
        },
        // Completion status
        Completed: {
            checkbox: {}
        },
        // When the task was completed
        CompletedAt: {
            date: {}
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
                goldEarned: 25,
                dueDate: "2024-03-03"
            },
            {
                title: "Complete weekly report",
                details: "Finish the weekly progress report for the project team.",
                duration: 60,
                goldEarned: 100,
                dueDate: "2024-03-05"
            },
            {
                title: "Grocery shopping",
                details: "Buy ingredients for dinner this week. Check the shopping list.",
                duration: 45,
                goldEarned: 40,
                dueDate: "2024-03-02"
            },
            {
                title: "Exercise routine",
                details: "Complete 30-minute workout routine. Focus on cardio and strength training.",
                duration: 30,
                goldEarned: 50,
                dueDate: "2024-03-01"
            },
            {
                title: "Read chapter 5",
                details: "Read and take notes on chapter 5 of the programming book.",
                duration: 90,
                goldEarned: 75,
                dueDate: "2024-03-04"
            }
        ];

        for (let task of sampleTasks) {
            await notion.pages.create({
                parent: {
                    database_id: tasksDb.id
                },
                properties: {
                    Title: {
                        title: [
                            {
                                text: {
                                    content: task.title
                                }
                            }
                        ]
                    },
                    "Task Details": {
                        rich_text: [
                            {
                                text: {
                                    content: task.details
                                }
                            }
                        ]
                    },
                    "Time to Complete": {
                        number: task.duration
                    },
                    "Gold Earned": {
                        number: task.goldEarned
                    },
                    DueDate: {
                        date: {
                            start: task.dueDate
                        }
                    },
                    Completed: {
                        checkbox: false
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