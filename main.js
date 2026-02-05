import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Use the stealth plugin to bypass basic bot detection
puppeteer.use(StealthPlugin());

async function runAutomation() {
  // launch browser with a user data directory to keep sessions active
  const browser = await puppeteer.launch({ 
    headless: "new",
    userDataDir: './user_data', // Saves your login session
    args: ['--no-sandbox'] 
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    console.log("Navigating to ChatGPT...");
    await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2' });

    // Selector for the input area
    const promptSelector = '#prompt-textarea';
    await page.waitForSelector(promptSelector, { timeout: 60000 });

    const myPrompt = "Write a short poem about automation.";
    console.log(`Sending prompt: ${myPrompt}`);

    // Type the prompt and hit Enter
    await page.type(promptSelector, myPrompt);
    await page.keyboard.press('Enter');

    // Wait for the response to finish streaming
    // We wait for the 'Stop' button to disappear and the 'Send' button to reappear
    console.log("Waiting for AI response...");
    const sendButtonSelector = 'button[aria-label="Start Voice"]';
    await page.waitForSelector(sendButtonSelector, { visible: true });

    // Extract the text from the last response block
    const responseText = await page.evaluate(() => {
      const messages = document.querySelectorAll('[data-message-author-role="assistant"] .markdown');
      const lastMessage = messages[messages.length - 1];
      return lastMessage ? lastMessage.innerText : "Could not find response.";
    });

    console.log("\n--- Captured Response ---");
    console.log(responseText);
    console.log("-------------------------\n");

  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    // Keep browser open for inspection, or close it:
    // await browser.close();
  }
}

runAutomation();

