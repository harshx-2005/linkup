try {
    console.log("Testing import of conversationRoutes...");
    const routes = require('./src/routes/conversationRoutes');
    console.log("Import successful!");
} catch (error) {
    console.error("---------------------------------------------------");
    console.error("CRASH DETECTED:");
    console.error(error);
    console.error("---------------------------------------------------");
    if (error.stack) console.error(error.stack);
}
