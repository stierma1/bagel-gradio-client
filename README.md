# bagel-gradio-client

Client to access Bytedance's Bagel AI through its Gradio interface.

## Project Description

`bagel-gradio-client` is a Node.js client that allows you to interact with Bytedance's Bagel AI model through its Gradio interface. This client provides a simple API to perform various operations such as text-to-image generation, image editing, and image captioning.

## Features

- Text-to-Image generation
- Image editing with text prompts
- Image captioning
- Asynchronous processing with event streaming
- Easy integration with Node.js applications

## Requirements

Before using this client, you need to have the Gradio interface for Bagel AI running. The client communicates with the AI model through this interface, so make sure it's accessible at the specified URL (default is `http://localhost:7865`).

## Installation

To install the client, clone this repository and install the dependencies:

```bash
git clone https://github.com/yourusername/bagel-gradio-client.git
cd bagel-gradio-client
npm install
```

## API Documentation

The client exposes the following methods:

### Constructor

```javascript
const client = new BagelClient([baseUrl]);
```

- `baseUrl` (optional): The base URL of the Gradio interface. Defaults to `http://localhost:7865`, This can also be set by an environment variable `BAGEL_URL`.

### textToImage(prompt, [options])

Generates an image from a text prompt.

- `prompt` (string): The text prompt describing the image to generate.
- `options` (object, optional): Configuration options for the generation process.
  - `show_thinking` (boolean, default: false): Whether to show the thinking process.
  - `cfg_text_scale` (number, default: 4.0): Text scale for the generation.
  - `cfg_interval` (number, default: 0.4): Interval for the generation.
  - `timestep_shift` (number, default: 3.0): Timestep shift for the generation.
  - `num_timesteps` (number, default: 50): Number of timesteps.
  - `cfg_renorm_min` (number, default: 0.0): Minimum renormalization value.
  - `cfg_renorm_type` (string, default: 'global'): Renormalization type.
  - `max_think_token_n` (number, default: 2048): Maximum number of think tokens.
  - `do_sample` (boolean, default: false): Whether to sample during generation.
  - `text_temperature` (number, default: 0.3): Temperature for text generation.
  - `seed` (number, default: 0): Random seed for reproducibility.
  - `image_ratio` (string, default: '1:1'): Aspect ratio of the generated image.

Returns a promise that resolves to an object with an `imageUrl` property containing the URL of the generated image.

### editImage(imagePath, prompt, [options])

Edits an existing image based on a text prompt.

- `imagePath` (string): The path to the image file to edit.
- `prompt` (string): The text prompt describing the edits to make.
- `options` (object, optional): Configuration options for the editing process.
  - Same options as `textToImage` with additional:
    - `cfg_img_scale` (number, default: 2.0): Image scale for the editing.
    - `cfg_renorm_type` (string, default: 'text_channel'): Renormalization type for editing.

Returns a promise that resolves to an object with an `imageUrl` property containing the URL of the edited image.

### imageCaptioning(imagePath, prompt, [options])

Generates a caption for an image.

- `imagePath` (string): The path to the image file to caption.
- `prompt` (string): The text prompt for captioning.
- `options` (object, optional): Configuration options for the captioning process.
  - `show_thinking` (boolean, default: false): Whether to show the thinking process.
  - `do_sample` (boolean, default: false): Whether to sample during captioning.
  - `text_temperature` (number, default: 0.3): Temperature for text generation.
  - `max_new_tokens` (number, default: 2048): Maximum number of new tokens.

Returns a promise that resolves to an object with `think` and `text` properties containing the thinking process and the generated caption, respectively.

## Usage Examples

### Text-to-Image

```javascript
const client = new BagelClient();

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
      fs.writeFileSync(path.join(__dirname, 'output.png'), imageData);
      console.log('Image saved as output.png');
    }
  } catch (error) {
    console.error('Error in textToImageExample:', error.message);
  }
}

textToImageExample();
```

### Image Editing

```javascript
async function imageEditingExample() {
  try {
    const imagePath = path.join(__dirname, 'test_images', 'example.jpg');
    const prompt = 'Make the sky more colorful';

    const result = await client.editImage(imagePath, prompt, {show_thinking: true});
    console.log('Image Editing Result:', result);

    // Download and save the edited image
    if (result.imageUrl) {
      const imageData = await client.downloadImage(result.imageUrl);
      fs.writeFileSync(path.join(__dirname, 'edited.png'), imageData);
      console.log('Image saved as edited.png');
    }
  } catch (error) {
    console.error('Error in imageEditingExample:', error.message);
  }
}

imageEditingExample();
```

### Image Captioning

```javascript
async function imageCaptioningExample() {
  try {
    const imagePath = path.join(__dirname, 'test_images', 'example.jpg');
    const prompt = 'Describe this image';

    const result = await client.imageCaptioning(imagePath, prompt, {show_thinking: true});
    console.log('Image Captioning Result:', result);
  } catch (error) {
    console.error('Error in imageCaptioningExample:', error.message);
  }
}

imageCaptioningExample();
```

## Important Note

This client requires the Gradio interface for Bagel AI to be running. Make sure to start the interface before using the client. The default URL is `http://localhost:7865`, but you can specify a different URL when creating the client instance.

```javascript
const client = new BagelClient('http://your-gradio-url.com');
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
