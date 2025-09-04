function splitText(text: string, maxLength: number = 4096): string[] {
  if (!text || text.length <= maxLength) {
    return [text];
  }

  // find a paragraph break
  let splitPoint = text.lastIndexOf("\n\n", maxLength);
  if (splitPoint === -1 || splitPoint < maxLength * 0.8) {
    splitPoint = text.lastIndexOf("\n", maxLength);
  }
  if (splitPoint === -1 || splitPoint < maxLength * 0.8) {
    // try a sentence
    splitPoint = text.lastIndexOf(". ", maxLength);
  }
  if (splitPoint === -1 || splitPoint < maxLength * 0.8) {
    // split at max length
    splitPoint = maxLength;
  }

  const firstPart = text.substring(0, splitPoint).trim();
  const remainingPart = text.substring(splitPoint).trim();

  return [firstPart, ...splitText(remainingPart, maxLength)];
}

function convertVkLinksToHtml(text: string): string {
  if (!text) return "";

  // [url|title] pattern
  const linkPattern = /\[(?<url>[^[|]+)\|(?<title>[^\]]+)]/g;

  // [#alias|url1|url2] pattern
  const hashtagLinkPattern =
    /\[#(?<alias>[^[|]+)\|(?<url1>[^|]+)\|(?<url2>[^\]]+)]/g;

  const vkIdPattern = /^(id|club)\d+$/;
  const vkLinkPattern =
    /^(https?:\/\/)?(m\.)?vk\.com(\/[\w\-.~:/?#[\]@&()*+,;%="ёЁа-яА-Я]*)?$/;

  let safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  safeText = safeText.replace(
    hashtagLinkPattern,
    (_match, _alias, url1, _url2) => {
      if (vkLinkPattern.test(url1)) {
        if (!url1.startsWith("http")) {
          url1 = "https://" + url1;
        }
        return `<a href="${url1}">${url1}</a>`;
      }
      return url1;
    },
  );

  safeText = safeText.replace(linkPattern, (_match, url, title) => {
    if (vkIdPattern.test(url)) {
      url = `https://vk.com/${url}`;
    }

    if (vkLinkPattern.test(url)) {
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }
      return `<a href="${url}">${title}</a>`;
    }

    return `[${url}|${title}]`;
  });

  return safeText;
}

function getHtmlLink(url: string, text: string): string {
  if (url && !url.startsWith("http") && !url.startsWith("//")) {
    url = "https://" + url;
  }
  return `<a href="${url}">${text}</a>`;
}

function formatMessageText(text: string, useHtml: boolean = true): string {
  if (!text) return "";
  if (useHtml) {
    return convertVkLinksToHtml(text);
  } else {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
  }
}

function getVkLink(id: number, ownerId: number): string {
  return `https://vk.com/wall${ownerId}_${id}`;
}

export {
  formatMessageText,
  getHtmlLink,
  splitText,
  convertVkLinksToHtml,
  getVkLink,
};
