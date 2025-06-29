const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const glob = require("glob");
const BAGEL_URL = process.env["BAGEL_URL"];

class BagelClient {
  constructor(baseUrl = 'http://localhost:7865' ) {
    this.baseUrl = BAGEL_URL || bagelUrl;
  }

  async streamEventData(sessionHash) {
    const response = await axios.get(`${this.baseUrl}/gradio_api/queue/data`, {
      params: { session_hash: sessionHash },
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      let eventId = null;
      let outputUrl = null;
      let buffer = '';
      let output = null;

      response.data.on('data', chunk => {
        buffer += chunk.toString();

        // Process complete lines
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Save the last partial line

        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.msg === 'estimation' || data.msg === 'process_starts') {
                eventId = data.event_id;
              } else if (data.msg === 'process_completed' && data.output) {

                if (data.output.data && data.output.data[0]) {
                  outputUrl = data.output.data[0].url;
                  output = data.output.data[0];
                }
                resolve({ eventId, outputUrl,  output});
              }
            } catch (error) {
              console.error('Error parsing event data:', error);
            }
          }
        });
      });

      response.data.on('end', () => {
        if (!outputUrl) {
          reject(new Error('No output URL received'));
        }
      });

      response.data.on('error', error => {
        reject(error);
      });
    });
  }

  async streamUploadProgress(uploadId) {
    const response = await axios.get(`${this.baseUrl}/gradio_api/upload_progress`, {
      params: { upload_id: uploadId },
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      let done = false;
      let buffer = '';

      response.data.on('data', chunk => {
        buffer += chunk.toString();
        // Process complete lines
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Save the last partial line

        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.msg === 'done') {
                console.log(data)
                done = true;
              }
            } catch (error) {
              console.error('Error parsing upload progress data:', error);
            }
          }
        });

        if (done) {
          resolve();
        }
      });

      response.data.on('end', () => {
        if (!done) {
          reject(new Error('Upload progress stream ended without completion'));
        }
      });

      response.data.on('error', error => {
        reject(error);
      });
    });
  }

  async uploadImage(imagePath) {
    const form = new FormData();
    form.append('files', fs.createReadStream(imagePath));

    const uploadId = "u" +(Math.random() + "").replace(".", "");
    const response = await axios.post(`${this.baseUrl}/gradio_api/upload`, form, {
      params: {upload_id: uploadId},
      headers: {
        ...form.getHeaders()
      }
    });

    await this.streamUploadProgress(uploadId);
    return response.data[0];
  }

  async downloadImage(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return response.data;
  }

  async textToImage(prompt, options = {}) {
    const {
      show_thinking = false,
      cfg_text_scale = 4.0,
      cfg_interval = 0.4,
      timestep_shift = 3.0,
      num_timesteps = 50,
      cfg_renorm_min = 0.0,
      cfg_renorm_type = 'global',
      max_think_token_n = 2048,
      do_sample = false,
      text_temperature = 0.3,
      seed = 0,
      image_ratio = '1:1'
    } = options;

    const response = await axios.post(`${this.baseUrl}/gradio_api/queue/join`, {
      data: [
        prompt,
        show_thinking,
        cfg_text_scale,
        cfg_interval,
        timestep_shift,
        num_timesteps,
        cfg_renorm_min,
        cfg_renorm_type,
        max_think_token_n,
        do_sample,
        text_temperature,
        seed,
        image_ratio
      ],
      event_data: null,
      fn_index: 1, // Text to Image function
      trigger_id: Math.floor(Math.random() * 1000),
      session_hash: 'anonymous'
    });

    const { outputUrl } = await this.streamEventData('anonymous');
    if (outputUrl) {
      return { imageUrl: outputUrl };
    } else {
      throw new Error('No image URL received');
    }
  }

  async editImage(imagePath, prompt, options = {}) {
    const {
      show_thinking = false,
      cfg_text_scale = 4.0,
      cfg_img_scale = 2.0,
      cfg_interval = 0.0,
      timestep_shift = 3.0,
      num_timesteps = 50,
      cfg_renorm_min = 0.0,
      cfg_renorm_type = 'text_channel',
      max_think_token_n = 1024,
      do_sample = false,
      text_temperature = 0.3,
      seed = 0
    } = options;

    // First upload the image
    const filePath = await this.uploadImage(imagePath);
    const session_hash = ("u" + Math.random()).replace(".", "");

    const response = await axios.post(`${this.baseUrl}/gradio_api/queue/join`, {
      data: [
        {
          meta: {_type: "gradio.FileData"},
          _type: "gradio.FileData",
          mime_type: "image/png",
          orig_name: "ihr2.png",
          path: filePath
        },
        prompt,
        show_thinking,
        cfg_text_scale,
        cfg_img_scale,
        cfg_interval,
        timestep_shift,
        num_timesteps,
        cfg_renorm_min,
        cfg_renorm_type,
        max_think_token_n,
        do_sample,
        text_temperature,
        seed
      ],
      event_data: null,
      fn_index: 3, // Image Editing function
      trigger_id: Math.floor(Math.random() * 1000),
      session_hash
    });

    const { outputUrl } = await this.streamEventData(session_hash);
    if (outputUrl) {
      return { imageUrl: outputUrl };
    } else {
      throw new Error('No image URL received');
    }
  }

  async imageCaptioning(imagePath, prompt, options = {}) {
    const {
      show_thinking = false,
      do_sample = false,
      text_temperature = 0.3,
      max_new_tokens = 2048
    } = options;

    // First upload the image
    const filePath = await this.uploadImage(imagePath);
    const session_hash = ("u" + Math.random()).replace(".", "");
    const response = await axios.post(`${this.baseUrl}/gradio_api/queue/join`, {
      data: [
        {path:filePath},
        prompt,
        show_thinking,
        do_sample,
        text_temperature,
        max_new_tokens
      ],
      event_data: null,
      fn_index: 4, // Image Captioning function
      trigger_id: Math.floor(Math.random() * 1000),
      session_hash: session_hash
    });

    const { outputUrl, output } = await this.streamEventData(session_hash);
    if (output) {
      return { think: output.split("</think>\n").length > 1 ? output.split("</think>\n")[0].replace("<think>\n", "") : null,  text: output.split("</think>\n")[output.split("</think>\n").length - 1] };
    } else {
      throw new Error('No text received');
    }
  }
}
/*
const client = new BagelClient();

async function imageCaptioningExample(imagePath) {
  try {
    const prompt =  `Create a caption for this image.  Address all the subjects and elements in the scene, how the character's look and or are dressed, what items are in the image, what action is likely taking place, the mood of the scene and camera position.   Do not mention caption in the output.`;
    const result = await client.imageCaptioning(imagePath, prompt, {show_thinking:true});
    return result;
  } catch (error) {
    console.error('Error in imageCaptioningExample:', error.message);
  }
}

async function captionAllTheThings(){
  const files = glob.sync(path.join(__dirname, '..', 'public', 'datasets', 'hr-giger', 'images', "*"));
  const prefix = "HR Giger style."
  for(const file of files){
    console.log(file);
    if(file.indexOf(".txt") !== -1){
      continue;
    }
    let baseFile = file.split("/")[file.split("/").length - 1];
    let baseName = baseFile.split(".")[0];
    
    let captionFile = baseName + ".txt";
    let {text} = await imageCaptioningExample(file);
    fs.writeFileSync(path.join(__dirname, '..', 'public', 'datasets', 'hr-giger', 'images', captionFile), prefix + " " + text);
  }
}

captionAllTheThings();
*/
module.exports = BagelClient;