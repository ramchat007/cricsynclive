const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "your_cloud_name";
const guaranteedBase = "w_1920,h_1080,c_fill,e_colorize:100,co_rgb:0f172a/channels4_profile.jpg";

const encodeUrlSafeBase64 = (url: string) => {
  let b64 = typeof window === "undefined" ? Buffer.from(url).toString("base64") : btoa(url);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const buildImageLayer = (url: string, resizeParams: string, positionParams: string) => {
  if (!url) return "";
  if (url.includes("res.cloudinary.com")) {
    const uploadSplit = url.split("/upload/");
    if (uploadSplit.length === 2) {
      const segments = uploadSplit[1].split("/");
      const transformations: string[] = [];
      const publicIdSegments: string[] = [];
      for (const seg of segments) {
        if (/^v\d+$/.test(seg)) continue;
        if (/^[a-z]_/.test(seg)) transformations.push(seg);
        else publicIdSegments.push(seg);
      }
      let publicId = publicIdSegments.join(":").replace(/\.[^/.]+$/, "");
      const transString = transformations.length > 0 ? transformations.join("/") + "/" : "";
      return `l_${publicId}/${transString}${resizeParams}/${positionParams}/`;
    }
  }
  return `l_fetch:${encodeUrlSafeBase64(url)}/${resizeParams}/${positionParams}/`;
};

// ==========================================
// CRASH-PROOF GENERATORS
// ==========================================

export function generateMatchPoster({ teamAName, teamBName, teamALogo, teamBLogo, matchDate, venue, tournamentName, matchPhase }: any) {
  const dateObj = new Date(matchDate);
  const formattedDate = isNaN(dateObj.getTime()) ? "TBD" : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  const tA = encodeURIComponent((teamAName || "TEAM A").toUpperCase());
  const tB = encodeURIComponent((teamBName || "TEAM B").toUpperCase());
  const details = encodeURIComponent(`${formattedDate} | ${venue || "TBD"}`.toUpperCase());
  const tName = encodeURIComponent((tournamentName || "TOURNAMENT").toUpperCase());
  const phase = encodeURIComponent((matchPhase || "MATCH DAY").toUpperCase());

  const tourneyLayer = `l_text:Oswald_50_bold_letter_spacing_10:${tName},co_rgb:94a3b8,g_top,y_80`;
  const phaseLayer = `l_text:Roboto_40_bold_letter_spacing_5:${phase},co_rgb:fbbf24,g_top,y_150`;
  
  const teamALayer = `l_text:Oswald_80_bold:${tA},co_rgb:ffffff,g_center,x_-450,y_150`;
  const teamBLayer = `l_text:Oswald_80_bold:${tB},co_rgb:ffffff,g_center,x_450,y_150`;
  const infoLayer = `l_text:Roboto_40_bold:${details},co_rgb:ffffff,g_bottom,y_150`;
  const vsLayer = `l_text:Oswald_100_bold:VS,co_rgb:475569,g_center,y_0`;

  const logoALayer = buildImageLayer(teamALogo, "c_fit,w_400,h_400", "g_center,x_-450,y_-100");
  const logoBLayer = buildImageLayer(teamBLogo, "c_fit,w_400,h_400", "g_center,x_450,y_-100");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${tourneyLayer}/${phaseLayer}/${logoALayer}${logoBLayer}${teamALayer}/${teamBLayer}/${vsLayer}/${infoLayer}/${guaranteedBase}`;
}

export function generatePlayerPoster({ playerName, role, battingStyle, bowlingStyle, teamName, playerImage, tournamentName }: any) {
  const pName = encodeURIComponent((playerName || "UNKNOWN PLAYER").toUpperCase());
  const pRole = encodeURIComponent((role || "PLAYER").toUpperCase());
  const pBat = encodeURIComponent(`BAT: ${battingStyle || "N/A"}`.toUpperCase());
  const pBowl = encodeURIComponent(`BOWL: ${bowlingStyle || "N/A"}`.toUpperCase());
  const tName = encodeURIComponent((teamName || "INDEPENDENT").toUpperCase());
  const tourney = encodeURIComponent((tournamentName || "").toUpperCase());

  const tourneyLayer = `l_text:Oswald_40_bold_letter_spacing_10:${tourney},co_rgb:94a3b8,g_top,y_80`;
  const nameLayer = `l_text:Oswald_100_bold:${pName},co_rgb:ffffff,g_center,y_150`;
  const roleLayer = `l_text:Roboto_50_bold:${pRole},co_rgb:fbbf24,g_center,y_250`;
  
  // New detailed layers
  const stylesLayer = `l_text:Roboto_35_bold:${pBat}   |   ${pBowl},co_rgb:cbd5e1,g_center,y_320`;
  const teamLayer = `l_text:Roboto_40_bold_letter_spacing_5:${tName},co_rgb:ffffff,g_bottom,y_100`;

  const avatarLayer = buildImageLayer(playerImage, "c_fill,w_500,h_500,r_max", "g_center,y_-150");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${tourneyLayer}/${avatarLayer}${nameLayer}/${roleLayer}/${stylesLayer}/${teamLayer}/${guaranteedBase}`;
}

export function generateTeamPoster({ teamName, teamLogo, shortName }: any) {
  const tName = encodeURIComponent((teamName || "UNKNOWN TEAM").toUpperCase());
  const tShort = encodeURIComponent((shortName || "TBD").toUpperCase());

  const nameLayer = `l_text:Oswald_120_bold:${tName},co_rgb:ffffff,g_center,y_200`;
  const shortLayer = `l_text:Roboto_60_bold:${tShort},co_rgb:fbbf24,g_center,y_320`;
  
  const logoLayer = buildImageLayer(teamLogo, "c_fit,w_500,h_500", "g_center,y_-100");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${logoLayer}${nameLayer}/${shortLayer}/${guaranteedBase}`;
}