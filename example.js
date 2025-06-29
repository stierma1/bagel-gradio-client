const BagelClient = require('./bagel-client');
const fs = require('fs');
const path = require('path');

// Initialize the client with the correct endpoint
const client = new BagelClient();

// Example 1: Text-to-Image
async function textToImageExample() {
  try {
    const prompt = 'A beautiful sunset over a mountain range';
    const options = {
      image_ratio: '16:9',
      show_thinking: true,
      seed: 42
    };

    const result = await client.textToImage(prompt, options);
    console.log('Text-to-Image Result:', result);

    // Download and save the generated image
    if (result.imageUrl) {
      const imageData = await client.downloadImage(result.imageUrl);
      fs.writeFileSync(path.join(__dirname, 'output_text2image.png'), imageData);
      console.log('Image saved as output_text2image.png');
    }
  } catch (error) {
    console.error('Error in textToImageExample:', error.message);
  }
}

// Example 2: Image Editing
async function imageEditingExample() {
  try {
    const imagePath = path.join(__dirname, 'test_images', 'women.jpg');
    const prompt = 'She boards a modern subway, quietly reading a folded newspaper, wearing the same clothes.';

    const result = await client.editImage(imagePath, prompt, {show_thinking:true});
    console.log('Image Editing Result:', result);

    // Download and save the edited image
    if (result.imageUrl) {
      const imageData = await client.downloadImage(result.imageUrl);
      fs.writeFileSync(path.join(__dirname, 'output_edited.png'), imageData);
      console.log('Image saved as output_edited.png');
    }
  } catch (error) {
    console.error('Error in imageEditingExample:', error.message);
  }
}

// Example 3: Image Captioning
async function imageCaptioningExample() {
  try {
    const imagePath = path.join(__dirname, 'test_images', 'meme.jpg');
    const prompt = 'Explain what\'s funny about this meme';

    const result = await client.imageCaptioning(imagePath, prompt, {show_thinking:true});
    console.log('Image Captioning Result:', result);
  } catch (error) {
    console.error('Error in imageCaptioningExample:', error.message);
  }
}

// Run the examples
(async () => {
  console.log('Running Text-to-Image Example...');
  await textToImageExample();

  console.log('\nRunning Image Editing Example...');
  await imageEditingExample();

  console.log('\nRunning Image Captioning Example...');
  await imageCaptioningExample();
})();