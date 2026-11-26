// Rear-camera preview only. No microphone, recording, or uploads.
export function makeSignalCamera(markMoment) {
  const get = (id) => document.getElementById(id);
  const dialog = get("signalCameraDialog"), video = get("signalCameraVideo");
  const status = get("signalCameraStatus"), placement = get("signalCameraPlace");
  const radio = get("signalCameraRadio"), readout = get("signalCameraReadout");
  const marker = get("signalCameraMark"), markerStatus = get("signalCameraMarkStatus");
  let stream = null, generation = 0, opening = false, x = 50, y = 67;

  function position(left, top) {
    x = Math.min(82, Math.max(18, left)); y = Math.min(84, Math.max(16, top));
    radio.style.left = `${x}%`; radio.style.top = `${y}%`;
  }
  function release() {
    generation++; opening = false; placement.disabled = true;
    const current = stream; stream = null;
    video.srcObject = null;
    current?.getTracks().forEach((track) => track.stop());
  }
  function close() {
    release();
    if (dialog.open) dialog.close();
  }
  function fail(text) {
    release();
    status.textContent = text;
  }
  get("signalCameraClose").addEventListener("click", close);
  marker.addEventListener("click", () => { markerStatus.textContent = markMoment(); });
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  dialog.addEventListener("close", () => { if (!dialog.open && (opening || stream)) release(); });
  placement.addEventListener("click", (event) => {
    if (!event.detail) { position(50, 67); return; }
    const box = placement.getBoundingClientRect();
    position((event.clientX - box.left) * 100 / box.width, (event.clientY - box.top) * 100 / box.height);
  });
  placement.addEventListener("keydown", (event) => {
    const offset = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[event.key];
    if (!offset) return;
    event.preventDefault(); position(x + offset[0], y + offset[1]);
  });

  return {
    canOpen: typeof dialog.showModal === "function" && typeof navigator.mediaDevices?.getUserMedia === "function",
    setReadout(line) { if (readout.textContent !== line) readout.textContent = line; },
    showMarker(show) { marker.hidden = !show; },
    close,
    pause(keepPending) { if (!keepPending || !opening) close(); },
    async open() {
      if (dialog.open) return;
      const id = ++generation;
      status.textContent = "Starting the camera…";
      markerStatus.textContent = "";
      opening = true;
      position(50, 67);
      dialog.showModal();
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 720 }, height: { ideal: 540 } },
        });
        if (generation !== id || !dialog.open || document.hidden) {
          next.getTracks().forEach((track) => track.stop());
          if (generation === id) fail("Camera paused. Close this view and open it again to retry.");
          return;
        }
        stream = next;
        opening = false;
        for (const track of next.getVideoTracks()) {
          track.addEventListener("ended", () => {
            if (generation === id) fail("The camera stopped. Close this view and open it again to retry.");
          }, { once: true });
        }
        video.srcObject = next;
        await video.play();
        if (generation !== id) return;
        status.textContent = "Live camera · Not recording";
        placement.disabled = false;
      } catch (error) {
        if (generation !== id) return;
        fail(error?.name === "NotAllowedError"
          ? "Camera access wasn’t granted. Close this view to keep listening, or allow camera access in Android settings and retry."
          : "I couldn’t open the camera. You can still listen and use the sensor controls.");
      }
    },
  };
}
