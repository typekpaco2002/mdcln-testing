import { execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(execFile);
const EXIFTOOL_PATH = process.env.EXIFTOOL_PATH || "exiftool";

function toExifDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toGpsDateStamp(date) {
  return date.toISOString().split("T")[0].replace(/-/g, ":");
}

function toGpsTimeStamp(date) {
  return date.toISOString().split("T")[1].replace(/\.\d{3}Z$/, "");
}

function toGPSCoords(decimal) {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = ((minFull - min) * 60).toFixed(4);
  return `${deg} ${min} ${sec}`;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function isValidLatitude(lat) {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

function isValidLongitude(lng) {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

/**
 * @param {{
 *  filePath: string,
 *  profile: import("../data/iphone-profiles.js").IPhoneProfile,
 *  dateTaken: Date,
 *  gpsLat: number|null,
 *  gpsLng: number|null,
 *  gpsAlt?: number|null,
 *  randomizeShutter?: boolean,
 *  randomizeISO?: boolean,
 * }} options
 */
export async function writeMetadata(options) {
  const {
    filePath,
    profile,
    dateTaken,
    gpsLat,
    gpsLng,
    gpsAlt,
    randomizeShutter = true,
    randomizeISO = true,
  } = options;

  if (!profile) {
    throw new Error("Metadata profile is required.");
  }
  if (!(dateTaken instanceof Date) || Number.isNaN(dateTaken.getTime())) {
    throw new Error("Invalid dateTaken value.");
  }

  const hasGps = isValidLatitude(gpsLat) && isValidLongitude(gpsLng);

  const iso = randomizeISO
    ? Math.round(rand(profile.isoRange[0], profile.isoRange[1]))
    : profile.isoRange[0];

  const shutterDenom = randomizeShutter
    ? Math.round(rand(profile.shutterRange[0], profile.shutterRange[1]))
    : profile.shutterRange[0];

  const exifDate = toExifDate(dateTaken);

  const args = [
    "-overwrite_original",
    "-m",
    "-all=",
    "-XMP:all=",
    "-C2PA:all=",
    "-XMP-c2pa:all=",
    `-Make=${profile.make}`,
    `-Model=${profile.model}`,
    `-Software=${profile.software}`,
    `-LensModel=${profile.lensModel}`,
    `-FocalLength=${profile.focalLength} mm`,
    `-FocalLengthIn35mmFormat=${profile.focalLength35mm}`,
    `-FNumber=${profile.fNumber}`,
    `-ApertureValue=${profile.fNumber}`,
    `-ISO=${iso}`,
    `-ExposureTime=1/${shutterDenom}`,
    `-ShutterSpeedValue=1/${shutterDenom}`,
    `-ExposureMode=${profile.exposureMode}`,
    `-WhiteBalance=${profile.whiteBalance}`,
    `-SceneCaptureType=${profile.sceneCaptureType}`,
    `-ExifVersion=${profile.exifVersion}`,
    `-FlashPixVersion=${profile.flashpixVersion}`,
    `-ColorSpace=${profile.colorSpace}`,
    `-XResolution=${profile.xResolution}`,
    `-YResolution=${profile.yResolution}`,
    `-BrightnessValue=${profile.brightnessValue}`,
    `-DateTimeOriginal=${exifDate}`,
    `-CreateDate=${exifDate}`,
    `-ModifyDate=${exifDate}`,
  ];

  if (hasGps) {
    const altitude = Number.isFinite(gpsAlt)
      ? gpsAlt
      : rand(profile.gpsAltitudeRange[0], profile.gpsAltitudeRange[1]);

    const latRef = gpsLat >= 0 ? "N" : "S";
    const lngRef = gpsLng >= 0 ? "E" : "W";
    const latSign = gpsLat >= 0 ? "+" : "-";
    const lngSign = gpsLng >= 0 ? "+" : "-";
    const latAbs = Math.abs(gpsLat).toFixed(6);
    const lngAbs = Math.abs(gpsLng).toFixed(6);
    const quicktimeGps = `${latSign}${latAbs}${lngSign}${lngAbs}+${Math.abs(altitude).toFixed(1)}/`;

    args.push(
      `-GPSLatitude=${toGPSCoords(gpsLat)}`,
      `-GPSLatitudeRef=${latRef}`,
      `-GPSLongitude=${toGPSCoords(gpsLng)}`,
      `-GPSLongitudeRef=${lngRef}`,
      `-GPSAltitude=${altitude.toFixed(2)}`,
      "-GPSAltitudeRef=0",
      `-GPSDateStamp=${toGpsDateStamp(dateTaken)}`,
      `-GPSTimeStamp=${toGpsTimeStamp(dateTaken)}`,
      `-Keys:GPSCoordinates=${quicktimeGps}`,
      `-QuickTime:GPSCoordinates=${quicktimeGps}`,
    );
  }

  args.push(
    "-HostComputer=",
    "-UserComment=",
    filePath,
  );

  await execAsync(EXIFTOOL_PATH, args, { timeout: 30000 });
}
