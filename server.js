const express = require("express");
const axios = require("axios");
const Creatomate = require("creatomate");
const client = new Creatomate.Client(process.env.CREATOMATE_API_KEY);

const app = express();

const port = 3210;

app.get("/", async (req, res) => {
    const { reviews, music } = req.body;

//   const reviews = [
//     {
//       images:
//         "https://fishingbooker-dev-storage.s3.amazonaws.com/public/images/review/422247/public/a14a4631caf4801838312a875222a3c1.jpeg",

//       description:
//         "It was the best fishing experience I’ve ever had! I would come back everyday for a week straight. I would skip school for this! 5 stars all the way! ",
//     },
//     {
//       images:
//         "https://fishingbooker-dev-storage.s3.amazonaws.com/public/images/review/422247/public/0fb52c45610d36d901d97f86641ebc7c.jpeg",

//       description:
//         "This was a great fishing trip for our family!  Despite having our own dolphin shows (which was pretty cool), Chris kept moving the boat and we caught alot of fish! Chris is professional, personable, played great music and got us back safely as a storm seemed to be chasing us almost all the way back.  We would definately recommend Chris and the Maximus!!",
//     },
//   ];

  const captions = reviews.map(async (review) => {
    const { description } = review;
    const caption = await getMostImportantSentence(description);

    return caption;
  });

  const responses = await Promise.all([...captions]);

  const slideshow = await createSlideShowWithCaptions(
    reviews.map((r) => r.images),
    responses,
    music
  );

  res.status(200).send({ url: slideshow[0].url });
});

const getMostImportantSentence = async (description) => {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    JSON.stringify({
      model: "gpt-3.5-turbo-16k-0613",
      messages: [
        {
          role: "user",
          content: `Find the most positive sentence in the following review: ${description}`,
        },
      ],
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
      },
    }
  );

  return response.data.choices[0].message.content;
};

const createSlideShowWithCaptions = async (images, captions, music) => {
  const source = new Creatomate.Source({
    outputFormat: "mp4",
    frameRate: 25,
    width: 1080,
    height: 1080,
    elements: [
      ...images.map(
        (image) =>
          new Creatomate.Image({
            track: 1,
            duration: 2,
            source: image,
            animations: [
              new Creatomate.PanCenter({
                startScale: "100%",
                endScale: "120%",
                easing: "linear",
              }),
            ],
          })
      ),
      new Creatomate.Audio({
        source: music,
        duration: null,
        audioFadeOut: 2,
      }),
      ...captions.map(
        (caption, index) =>
          new Creatomate.Text({
            text: caption,
            y: "75%",
            width: "100%",
            height: "50%",
            xPadding: "5 vw",
            yPadding: "5 vh",
            yAlignment: "100%",
            xAlignment: "50%",
            font: new Creatomate.Font("Open Sans", 700),
            fontSizeMaximum: "5 vmin",
            background: new Creatomate.TextBackground(
              "#fff",
              "23%",
              "8%",
              "0%",
              "0%"
            ),
            duration: 2,
            time: index * 2,
            fillColor: "#333",
            enter: new Creatomate.TextSlide({
              duration: 2,
              easing: "quadratic-out",
              split: "line",
              scope: "element",
              backgroundEffect: "scaling-clip",
            }),
          })
      ),
    ],
  });

  return await client.render({ source });
};

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
