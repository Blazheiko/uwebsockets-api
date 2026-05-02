/**
 * Парсит User-Agent строку и извлекает информацию о устройстве, браузере и ОС
 */
export interface ParsedUserAgent {
  deviceType: string | undefined;
  browser: string | undefined;
  os: string | undefined;
}

export const parseUserAgent = (
  userAgent: string | undefined | null
): ParsedUserAgent => {
  if (userAgent === undefined || userAgent === null || userAgent.trim() === "") {
    return {
      deviceType: undefined,
      browser: undefined,
      os: undefined,
    };
  }

  const ua = userAgent.toLowerCase();
  let deviceType: string | undefined;
  let browser: string | undefined;
  let os: string | undefined;

  // Определение типа устройства
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = "tablet";
  } else if (
    /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(
      ua
    )
  ) {
    deviceType = "mobile";
  } else {
    deviceType = "desktop";
  }

  // Определение браузера
  if (ua.includes("edg/")) {
    browser = "Edge";
  } else if (ua.includes("chrome/") && !ua.includes("edg/")) {
    browser = "Chrome";
  } else if (ua.includes("firefox/")) {
    browser = "Firefox";
  } else if (ua.includes("safari/") && !ua.includes("chrome/")) {
    browser = "Safari";
  } else if (ua.includes("opera/") || ua.includes("opr/")) {
    browser = "Opera";
  } else if (ua.includes("msie") || ua.includes("trident/")) {
    browser = "Internet Explorer";
  } else if (ua.includes("yabrowser")) {
    browser = "Yandex Browser";
  } else if (ua.includes("vivaldi")) {
    browser = "Vivaldi";
  } else if (ua.includes("brave")) {
    browser = "Brave";
  }

  // Определение ОС
  if (ua.includes("windows nt")) {
    os = "Windows";
  } else if (ua.includes("mac os x") || ua.includes("macintosh")) {
    os = "macOS";
  } else if (ua.includes("linux") && !ua.includes("android")) {
    os = "Linux";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod")
  ) {
    os = "iOS";
  } else if (ua.includes("windows phone")) {
    os = "Windows Phone";
  } else if (ua.includes("blackberry")) {
    os = "BlackBerry";
  } else if (ua.includes("freebsd")) {
    os = "FreeBSD";
  } else if (ua.includes("openbsd")) {
    os = "OpenBSD";
  } else if (ua.includes("sunos")) {
    os = "Solaris";
  }

  return {
    deviceType,
    browser,
    os,
  };
};
