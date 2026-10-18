export const onRequestGet = async () => {
  const manifest = {
    name: "Sentient Partners",
    short_name: "Sentient",
    start_url: "/",
    display: "standalone",
    background_color: "#081536",
    theme_color: "#0d1f4e",
    description:
      "Your local business and technology partner in Auburn, California.",
    icons: [
      { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
};
