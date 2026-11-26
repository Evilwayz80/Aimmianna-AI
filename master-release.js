const decode = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

export async function readMasterRelease(response, authority) {
  if (!authority?.key || !crypto?.subtle || !response.ok) throw Error("Windows release approval is unavailable.");
  const envelope = await response.json();
  if (!envelope || typeof envelope.payload !== "string" || envelope.payload.length > 16000 ||
      typeof envelope.signature !== "string" || envelope.signature.length > 100) throw Error("Invalid release approval.");
  const bytes = decode(envelope.payload), signature = decode(envelope.signature);
  if (signature.length !== 64) throw Error("Invalid release signature.");
  const key = await crypto.subtle.importKey("jwk", authority.key, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature, bytes);
  if (!valid) throw Error("This update was not approved by Windows Master Control.");
  const release = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (release.format !== "aimmianna-companion-release-v1" || !Number.isSafeInteger(release.build) ||
      !Number.isSafeInteger(release.webBuild) || release.build < 1 || release.webBuild < 1 ||
      !/^\d+\.\d+\.\d+$/.test(release.version) || !/^\d+\.\d+\.\d+$/.test(release.webVersion) ||
      typeof release.apk !== "string" || !/^[a-f0-9]{64}$/.test(release.apkSha256) ||
      !/^[a-f0-9]{64}$/.test(release.webSha256)) throw Error("Approved release information is incomplete.");
  const apk = new URL(release.apk);
  if (apk.protocol !== "https:" || apk.username || apk.password) throw Error("The approved APK address is not HTTPS.");
  return release;
}
