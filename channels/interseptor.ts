//@ts-nocheck

page.on('request', async (request) => {
  if (request.url().includes('/backend-api/conversation') && request.method() === 'POST') {
    const payload = JSON.parse(request.postData());

    // Modify the payload on the fly
    payload.model = "gpt-4-mobile"; // Example: Force a different model
    
    await request.continue({
      postData: JSON.stringify(payload)
    });
  } else {
    request.continue();
  }
});

await page.setRequestInterception(true);

page.on('request', request => {
  if (request.url().includes('/backend-api/conversation')) {
    console.log('--- Outgoing ChatGPT Request ---');
    console.log('URL:', request.url());
    console.log('Payload:', request.postData()); // This is the JSON sent to OpenAI
  }
  request.continue();
});
