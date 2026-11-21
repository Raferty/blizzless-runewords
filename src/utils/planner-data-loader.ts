// Browser implementation of d2r-saver's game-data loader.
export async function loadDataFromFile(dataUrl: string, stringsUrl: string) {
  const [rawData, locale] = await Promise.all(
    [dataUrl, stringsUrl].map(async (url) => {
      const response = await fetch(url, { cache: "no-cache" });
      if (!response.ok)
        throw new Error(`Failed to load ${url} (HTTP ${response.status})`);
      return response.json();
    })
  );
  return { rawData, locale };
}
