/**
 * Tutorial Videos Configuration
 *
 * Each tutorial contains:
 * - title: Display name
 * - youtubeId: YouTube video ID (from URL: youtube.com/watch?v=VIDEO_ID)
 * - description: Short explanation of what the tutorial covers
 */

export const TUTORIALS = {
  // IMAGE GENERATION MODES
  image: {
    // Identity Recreation: Model + Target Image → Generated Image
    identity: {
      title: "Identity Recreation Tutorial",
      youtubeId: "sAuNdzdfwoM", // v46: Updated with actual tutorial
      description:
        "Learn how to recreate images using your model's identity with a target pose/scene",
    },

    // Prompt Image: Model + Text Prompt → AI Generated Image
    prompt: {
      title: "Prompt Image Generation Tutorial",
      youtubeId: "QiZh0Bn5xVs", // v46: Updated with actual tutorial
      description:
        "Generate creative images from text prompts using your model's face",
    },

    // Face Swap Image: Target Image + Source Face → Swapped Image
    faceswap: {
      title: "Face Swap Image Tutorial",
      youtubeId: "TWIF5Tj-dhY", // v46: Updated with actual tutorial
      description:
        "Swap faces in images - replace any face with another person's face",
    },
  },

  // VIDEO GENERATION MODES
  video: {
    // Quick Video: Image + Prompt → Video (Kling V2.5)
    quick: {
      title: "Quick Video Generation Tutorial",
      youtubeId: "G3g7vF1R0a0", // v46: Updated with actual tutorial
      description:
        "Generate videos from a single image and text prompt using AI",
    },

    // 2-Step Video: Model + Reference Video → Recreated Video
    twoStep: {
      title: "2-Step Video Generation Tutorial",
      videoUrl: "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/static/tutorial_step1.mov",
      description:
        "Create videos by extracting frames and applying motion transfer",
    },

    // Prompt Video: Image + Prompt → Video
    prompt: {
      title: "Prompt Video Generation Tutorial",
      youtubeId: "-_1ub81P71I", // v46: Added prompt video tutorial
      description:
        "Generate videos from an image and text prompt using AI motion",
    },

    // Face Swap Video: Source Video + Face Image → Swapped Video
    faceswap: {
      title: "Face Swap Video Tutorial",
      youtubeId: "iSAumQZoVB0", // v46: Updated with actual tutorial
      description:
        "Swap faces in videos - replace faces throughout an entire video",
    },
  },
};

/**
 * Helper function to get tutorial by mode
 * @param {string} tab - 'image' or 'video'
 * @param {string} mode - Mode identifier
 * @returns {Object|null} Tutorial object or null
 */
export function getTutorial(tab, mode) {
  return TUTORIALS[tab]?.[mode] || null;
}
