export const getDirectDriveLink = (url: string | null) => {
  if (!url) return '';
  // Check if it's a standard Drive view link
  const match = url.match(/\/file\/d\/([^\/]+)/);
  if (match && match[1]) {
    // Use the thumbnail endpoint with a large size request (w2000)
    // This endpoint is more reliable for embedding than uc?export=view
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2000`;
  }
  return url;
};

export const getLowResLink = (url: string | null) => {
  if (!url) return '';
  const match = url.match(/\/file\/d\/([^\/]+)/);
  if (match && match[1]) {
    // Fallback to smaller size (w400) which is more likely to succeed if high-res fails
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  }
  return url;
};

export const getExportViewLink = (url: string | null) => {
  if (!url) return '';
  const match = url.match(/\/file\/d\/([^\/]+)/);
  if (match && match[1]) {
    // Final fallback: use the export=view endpoint
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
};
