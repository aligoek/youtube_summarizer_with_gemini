if (window.hasGeminiSummarizerScript) {
} else {
  window.hasGeminiSummarizerScript = true;
  injectStyles();
  const pageObserver = new MutationObserver((mutations, obs) => {
    const secondaryElement = document.getElementById('secondary');
    const summaryBoxElement = document.getElementById('gemini-summary-box');

    if (secondaryElement) {
      if (!summaryBoxElement) {
        injectSummaryBox();
      }
    } else {
      if (summaryBoxElement) {
        summaryBoxElement.remove();
        summarizationStarted = false;
      }
    }
  });

  pageObserver.observe(document.body, {
    childList: true,
    subtree: true    
  });

  if (!window.hasGeminiSummarizerNavListener) {
    document.body.addEventListener('yt-navigate-finish', () => {
      summarizationStarted = false; 

      const summaryBox = document.getElementById('gemini-summary-box');
      if (summaryBox) {
        summaryBox.classList.remove('expanded');
        summaryBox.classList.add('collapsed');
        const summaryContentDiv = document.getElementById('gemini-summary-content');
        if (summaryContentDiv) summaryContentDiv.innerHTML = ''; 
        const loadingIndicator = summaryBox.querySelector('.gemini-loading-indicator');
        if (loadingIndicator) loadingIndicator.classList.remove('show');
      }
      if (document.getElementById('secondary') && !document.getElementById('gemini-summary-box')) {
        injectSummaryBox();
      }
    });
    window.hasGeminiSummarizerNavListener = true;
  }

  if (document.getElementById('secondary')) {
    injectSummaryBox();
  }
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #gemini-summary-box {
      border: 1px solid var(--yt-spec-10-percent-layer);
      border-radius: 12px;
      margin-bottom: 10px;
      background: transparent;
      background-color: var(--yt-lightsource-section4-color);
      font-family: sans-serif;
      color: var(--yt-spec-text-primary, #0f0f0f);
      width: 100%;
      box-sizing: border-box;
      font-size: 14px;
      line-height: 1.6;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    #gemini-summary-box.collapsed {
      cursor: pointer;
      display: flex;
      align-items: center;
    }

    #gemini-summary-box.expanded {
      max-height: 700px;
      overflow-y: auto;
      cursor: default;
    }

    .gemini-collapsed-content {
      display: flex;
      align-items: center;
      padding: 10px 15px;
      width: 100%;
    }

    #gemini-summary-box.expanded .gemini-collapsed-content {
      display: none !important;
    }

    #gemini-summary-content {
      padding: 10px 15px;
      word-wrap: break-word;
      display: none;
    }

    #gemini-summary-box.expanded #gemini-summary-content {
      display: block !important;
    }

    .gemini-loading-indicator {
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-top: 3px solid #3498db;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      animation: spin 1s linear infinite;
      margin-left: 10px;
      display: none;
      flex-shrink: 0;
    }

    .gemini-loading-indicator.show {
      display: block;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    #gemini-summary-content h1,
    #gemini-summary-content h2,
    #gemini-summary-content h3 {
      margin-bottom: 8px;
      font-weight: bold;
    }

    #gemini-summary-content h1 {
      font-size: 1.3em;
    }

    #gemini-summary-content h2 {
      font-size: 1.2em;
    }

    #gemini-summary-content h3 {
      font-size: 1.1em;
    }

    #gemini-summary-content p {
      margin: 10px 0;
      text-indent: 0;
    }

    #gemini-summary-content ul,
    #gemini-summary-content ol {
      margin: 10px 0;
      padding-left: 25px;
    }

    #gemini-summary-content li {
      margin-bottom: 5px;
    }

    #gemini-summary-content strong {
      font-weight: bold;
    }
    #gemini-summary-content em {
      font-style: bold;
    } 
  `;
  document.head.appendChild(style);
}

function injectSummaryBox() {
  if (document.getElementById('gemini-summary-box')) {
    return;
  }

  const summaryBox = document.createElement('div');
  summaryBox.id = 'gemini-summary-box';
  summaryBox.className = 'collapsed';

  summaryBox.innerHTML = `
    <div class="gemini-collapsed-content">
      <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" style="margin-right: 8px; fill: var(--yt-spec-text-secondary, #606060);">
        <path d="M15.5 14H14.71l-.29-.29c.91-1.02 1.46-2.33 1.46-3.71C15.88 7.3 13.05 4.47 9.66 4.47S3.44 7.31 3.44 10.7c0 3.39 2.83 6.23 6.22 6.22c1.38 0 2.69-.55 3.71-1.46l.29.29v.86l5.11 5.11l1.53-1.53l-5.11-5.11zm-6.21 0C7.3 14 5.44 12.16 5.44 10.7S7.3 7.47 9.66 7.47S13.88 9.31 13.88 10.7s-1.86 3.39-4.22 3.39z"></path>
      </svg>
      <span style="flex-grow: 1;">Summarize with Gemini</span>
      <div class="gemini-loading-indicator"></div>
    </div>
    <div id="gemini-summary-content"></div>
  `;

  const rightSidebar = document.getElementById('secondary');
  if (rightSidebar) {
    rightSidebar.insertBefore(summaryBox, rightSidebar.firstChild);
    summaryBox.addEventListener('click', handleBoxClick);
  } else {
  }
}

let summarizationStarted = false;

function handleBoxClick() {
  const summaryBox = document.getElementById('gemini-summary-box');
  if (summaryBox.classList.contains('expanded')) {
    return;
  }

  summaryBox.classList.remove('collapsed');
  summaryBox.classList.add('expanded');

  if (!summarizationStarted) {
    summarizationStarted = true;
    extractTranscriptAndSummarize();
  }
}

function updateSummaryBox(content, isLoading = false) {
  const summaryBox = document.getElementById('gemini-summary-box');
  if (!summaryBox) {
    return;
  }

  const summaryContentDiv = document.getElementById('gemini-summary-content');
  const loadingIndicator = summaryBox.querySelector('.gemini-loading-indicator');

  if (isLoading) {
    summaryContentDiv.textContent = content;
    loadingIndicator.classList.add('show');
  } else {
    summaryContentDiv.innerHTML = formatSummaryText(content);
    loadingIndicator.classList.remove('show');
  }
}

function formatSummaryText(text) {
    if (!text || text.trim() === '') {
        return '<p>No summary available.</p>';
    }

    let formattedText = text;

    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    formattedText = formattedText.replace(/^###\s+(.*?)$/gm, '<h3>$1</h3>');
    formattedText = formattedText.replace(/^##\s+(.*?)$/gm, '<h2>$1</h2>');
    formattedText = formattedText.replace(/^#\s+(.*?)$/gm, '<h1>$1</h1>');

    const lines = formattedText.split('\n');
    let htmlOutput = '';
    let inList = false;
    let listType = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmedLine = line.trim();

        if (trimmedLine === '') {
            if (inList) {
                htmlOutput += `</${listType}>`;
                inList = false;
                listType = null;
            }
            continue;
        }

        const ulMatch = trimmedLine.match(/^([-*+])\s+(.*)/);
        if (ulMatch) {
            const itemText = ulMatch[2];
            if (!inList || listType !== 'ul') {
                if (inList) {
                    htmlOutput += `</${listType}>`;
                }
                htmlOutput += '<ul>';
                inList = true;
                listType = 'ul';
            }
            htmlOutput += `<li>${itemText}</li>`;
        }
        else if (trimmedLine.match(/^\d+\.\s+/)) {
            const itemText = trimmedLine.replace(/^\d+\.\s+/, '');
            const currentItemNumber = parseInt(trimmedLine.match(/^(\d+)\./)[1], 10);

            if (!inList || listType !== 'ol') {
                if (inList) {
                    htmlOutput += `</${listType}>`;
                }
                htmlOutput += `<ol start="${currentItemNumber}">`;
                inList = true;
                listType = 'ol';
            }
            htmlOutput += `<li>${itemText}</li>`;
        }
        else if (/^<h[1-3]>.+?<\/h[1-3]>$/.test(line)) {
            if (inList) {
                htmlOutput += `</${listType}>`;
                inList = false;
                listType = null;
            }
            htmlOutput += line;
        }
        else {
            if (inList) {
                htmlOutput += `</${listType}>`;
                inList = false;
                listType = null;
            }
            htmlOutput += `<p>${trimmedLine}</p>`;
        }
    }

    if (inList) {
        htmlOutput += `</${listType}>`;
    }

    return htmlOutput;
}


async function extractTranscriptAndSummarize() {
  updateSummaryBox('Extracting transcript...', true);

  const videoUrl = window.location.href;
  const isShorts = /youtube\.com\/shorts\//.test(videoUrl);
  const videoId = isShorts
    ? videoUrl.split("/shorts/")[1].split(/[/?#&]/)[0]
    : new URLSearchParams(window.location.search).get("v");

  if (!videoId) {
    updateSummaryBox('Could not get video ID. This page might not be a YouTube video.', false);
    summarizationStarted = false;
    return;
  }

  try {
    const transcriptObj = await getTranscriptDict(videoUrl);
    const lines = transcriptObj.transcript.map(
      ([timestamp, text]) => `${text}`
    ).join(" ");

    if (lines.trim().length > 0) {
      updateSummaryBox('Transcript extracted. Sending to Gemini for summarization...', true);

      chrome.runtime.sendMessage({ action: "summarizeTranscript", transcript: lines }, (response) => {
        if (chrome.runtime.lastError) {
          updateSummaryBox(`Error: Could not send transcript. ${chrome.runtime.lastError.message}`, false);
          summarizationStarted = false;
          return;
        }
        
        if (response && response.status === "success") {
          updateSummaryBox(response.summary, false);
        } else {
          const errorMessage = response && response.message ? response.message : 'Unknown error during summarization.';
          updateSummaryBox(`Error summarizing: ${errorMessage}`, false);
          summarizationStarted = false;
        }
      });
    } else {
      updateSummaryBox('No transcript available or transcript is empty for this video.', false);
      summarizationStarted = false;
    }
  } catch (err) {
    updateSummaryBox(`Error extracting transcript: ${err.message}`, false);
    summarizationStarted = false;
  }
}

async function getTranscriptDict(videoUrl) {
  const isShorts = /youtube\.com\/shorts\//.test(videoUrl);
  const dataType = isShorts ? "shorts" : "regular";
  
  const { title, ytData, dataKey, resolvedType } = await resolveYouTubeData(videoUrl, dataType);
  
  const segments = await getTranscriptItems(ytData, dataKey);
  
  if (!segments.length) {
    return { title, transcript: [] };
  }
  
  const transcript = createTranscriptArray(segments, resolvedType);
  
  return { title, transcript };
}

async function resolveYouTubeData(videoUrl, initialType) {
  const dataKey = initialType === "regular" ? "ytInitialData" : "ytInitialPlayerResponse";
  
  let html;
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    html = await res.text();
  } catch (error) {
    throw error;
  }

  let ytData = extractJsonFromHtml(html, dataKey);

  let title = "Untitled";
  if (ytData?.videoDetails?.title) {
    title = ytData.videoDetails.title;
  } else if (ytData?.playerOverlays?.playerOverlayRenderer?.videoDetails?.playerOverlayVideoDetailsRenderer?.title?.simpleText) {
    title = ytData.playerOverlays.playerOverlayRenderer.videoDetails.playerOverlayVideoDetailsRenderer.title.simpleText;
  }

  if (dataKey === "ytInitialData") {
    const panels = ytData?.engagementPanels || [];
    const hasTranscriptPanel = panels.some(p =>
      p.engagementPanelSectionListRenderer?.content?.continuationItemRenderer?.continuationEndpoint?.getTranscriptEndpoint
    );
    
    if (!hasTranscriptPanel) {
      const fallbackData = extractJsonFromHtml(html, "ytInitialPlayerResponse");
      if (fallbackData?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.[0]?.baseUrl) {
        return {
          title: title || fallbackData?.videoDetails?.title || "Untitled",
          ytData: fallbackData,
          dataKey: "ytInitialPlayerResponse",
          resolvedType: "shorts"
        };
      } else {
      }
    }
  }

  if (!ytData) {
    if (dataKey === "ytInitialData") {
        const fallbackData = extractJsonFromHtml(html, "ytInitialPlayerResponse");
        if (fallbackData) {
             return {
                title: title || fallbackData?.videoDetails?.title || "Untitled",
                ytData: fallbackData,
                dataKey: "ytInitialPlayerResponse",
                resolvedType: "shorts" 
            };
        }
    }
    throw new Error("Could not extract required YouTube data (ytInitialData or ytInitialPlayerResponse).");
  }

  return {
    title,
    ytData,
    dataKey,
    resolvedType: initialType
  };
}

function createTranscriptArray(items, type) {
  if (!items || items.length === 0) {
    return [];
  }
  
  const transcript = type === "regular"
    ? items.map(item => getSegmentData(item))
    : items.filter(e => e.segs).map(e => getShortsSegmentData(e));
  
  return transcript;
}

function getSegmentData(item) {
  const seg = item?.transcriptSegmentRenderer;
  if (!seg) {
    return ["", ""];
  }
  const timestamp = seg.startTimeText?.simpleText || "";
  const text = seg.snippet?.runs?.map(r => r.text).join("") || "";
  return [timestamp, text];
}

function getShortsSegmentData(event) {
  if (!event || !event.segs) {
    return ["", ""];
  }
  const timestamp = msToTimestamp(event.tStartMs);
  const text = (event.segs || []).map(seg => seg.utf8).join("").replace(/\n/g, " ");
  return [timestamp, text];
}

function msToTimestamp(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

async function getTranscriptItems(ytData, dataKey) {
  if (dataKey === "ytInitialPlayerResponse") {
    const baseUrl = ytData?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.[0]?.baseUrl;
    if (!baseUrl) {
      const alternateBaseUrl = ytData?.streamingData?.adaptiveFormats?.find(f => f.captionTrack)?.captionTrack?.baseUrl;
      if (!alternateBaseUrl) {
        throw new Error("No transcript found in player response (checked primary and alternate paths).");
      }
      const captionUrl = alternateBaseUrl + "&fmt=json3";
      try {
        const res = await fetch(captionUrl);
        if (!res.ok) throw new Error(`HTTP error fetching captions! status: ${res.status}`);
        const json = await res.json();
        return json.events || [];
      } catch (error) {
        throw new Error(`Failed to fetch caption data (alternate path): ${error.message}`);
      }
    }
    const captionUrl = baseUrl + "&fmt=json3";
    try {
      const res = await fetch(captionUrl);
      if (!res.ok) throw new Error(`HTTP error fetching captions! status: ${res.status}`);
      const json = await res.json();
      return json.events || [];
    } catch (error) {
      throw new Error(`Failed to fetch caption data: ${error.message}`);
    }
  }

  const continuationParams = ytData.engagementPanels?.find(p =>
    p.engagementPanelSectionListRenderer?.content?.continuationItemRenderer?.continuationEndpoint?.getTranscriptEndpoint
  )?.engagementPanelSectionListRenderer?.content?.continuationItemRenderer?.continuationEndpoint?.getTranscriptEndpoint?.params;

  if (!continuationParams) {
    throw new Error("Transcript not available via engagement panel for this video (no continuationParams).");
  }

  const hl = ytData.topbar?.desktopTopbarRenderer?.searchbox?.fusionSearchboxRenderer?.config?.webSearchboxConfig?.requestLanguage || "en";
  const clientName = ytData.responseContext?.serviceTrackingParams?.find(p => p.service === "GUIDED_HELP")?.params?.find(p => p.key === "client.name")?.value || "WEB";
  const clientVersion = ytData.responseContext?.serviceTrackingParams?.find(p => p.service === "GUIDED_HELP")?.params?.find(p => p.key === "client.version")?.value || "2.20230101.00.00";
  const visitorData = ytData.responseContext?.webResponseContextExtensionData?.ytConfigData?.visitorData;


  const body = {
    context: {
      client: {
        hl,
        gl: "US",
        visitorData,
        clientName: clientName,
        clientVersion: clientVersion,
      },
      request: { useSsl: true }
    },
    params: continuationParams
  };
  
  const YOUTUBE_API_PREFIX = "https://www.youtube.com";
  const transcriptApiUrl = `${YOUTUBE_API_PREFIX}/youtubei/v1/get_transcript?key=${ytData.apiKey || ''}`;

  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/get_transcript", {
      method: "POST",
      headers: { 
          "Content-Type": "application/json",
        },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error fetching transcript! status: ${res.status} - ${errorText}`);
    }

    const json = await res.json();
    const segments = json.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer
      ?.content?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer?.initialSegments || [];
    
    if (!segments.length) {
    }
    return segments;
  } catch (error) {
    throw new Error(`Failed to fetch transcript: ${error.message}`);
  }
}

function extractJsonFromHtml(html, key) {
  const regexes = [
    new RegExp(`window\\["${key}"\\]\\s*=\\s*({[\\s\\S]+?})\\s*;\s*(?:var|window|if|ytcfg\\.set)`),
    new RegExp(`var ${key}\\s*=\\s*({[\\s\\S]+?})\\s*;\s*(?:var|window|if|ytcfg\\.set)`),
    new RegExp(`(?:var\\s+|window\\["${key}"\\]\\s*=\\s*|\\s*)${key}\\s*=\\s*({[\\s\\S]+?})\\s*;(?:\\s*window\\.ytplayer\\.config|\\s*if\\s*\\(|\\s*</script>)`),
    new RegExp(`${key}\\s*=\\s*({(?:[^{}]*|{(?:[^{}]*|{[^{}]*})*})*})\\s*;`)
  ];

  for (const regex of regexes) {
    const match = html.match(regex);
    if (match && match[1]) {
      try {
        let jsonString = match[1];
        let braceCount = 1;
        let i = 1;
        while (braceCount > 0 && i < jsonString.length) {
          if (jsonString[i] === '{') braceCount++;
          else if (jsonString[i] === '}') braceCount--;
          i++;
        }
        jsonString = jsonString.substring(0, i);
        jsonString = jsonString
          .replace(/,\s*([}\]])/g, '$1')
          .trim();
        return JSON.parse(jsonString);
      } catch (err) {
      }
    }
  }
  return null;
}

