import p5xr from '../core/p5xr';
import ARAnchor from './ARAnchor';

export default class p5ar extends p5xr {
  constructor() {
    super();
    this.canvas = null;
  }

  //* ********************************************************//
  //* *********ARCORE and ARKIT BASED AR BELOW****************//
  //* ********************************************************//

  /**
     * This is where the actual p5 canvas is first created, and
     * the GL rendering context is accessed by p5vr.
     * The current XRSession also gets a frame of reference and
     * base rendering layer. <br>
     * @param {XRSession}
     */
  startSketch(session) {
    this.xrSession = this.xrButton.session = session;
    this.xrSession.addEventListener('end', this.onSessionEnded);
    if (typeof touchStarted === 'function') {
      this.xrSession.addEventListener('select', touchStarted);
    }
    this.canvas = p5.instance.canvas;
    p5.instance._renderer._curCamera.cameraType = 'custom';
    this.onRequestSession();
    p5.instance._decrementPreload();
  }

  onSelect(event) {
    const context = window;
    const userMousePressed = context.mousePressed;
    if (typeof userMousePressed === 'function') {
      userMousePressed();
    }
  }

  detectHit(ev) {
    if (ev === null || typeof ev === 'undefined') {
      console.warn('You must pass the touchStarted event to detectHit.');
      return null;
    }

    if (!this.xrSession) {
      return null;
    }

    const y = ev.clientY / window.innerHeight;
    const x = ev.clientX / window.innerWidth;
    if (this.xrHitTestSource && this.viewer.pose && this.frame) {
      const hitTestResults = this.frame.getHitTestResults(this.xrHitTestSource);
      if (hitTestResults.length > 0) {
        // const pose = hitTestResults[0].getPose(ev.inputSource.targetRaySpace, this.xrRefSpace);
        const pose = hitTestResults[0].getPose(this.xrRefSpace);
        return createVector(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
      }
    }
  }

  createAnchor(vec) {
    if (vec === null || typeof vec === 'undefined') {
      return null;
    }
    return new ARAnchor(vec.x, vec.y, vec.z);
  }

  /**
   * `device.requestSession()` must be called within a user gesture event.
   * @param {XRDevice}
   */
  onXRButtonClicked(device) {
    if (window.injectedPolyfill) {
      console.log('ARCORE mode is not supported with a polyfill. Try using a more recent browser version');
      return;
    }
    // Normalize the various vendor prefixed versions of getUserMedia.
    navigator.getUserMedia = (navigator.getUserMedia
        || navigator.webkitGetUserMedia
        || navigator.mozGetUserMedia
        || navigator.msGetUserMedia);

    navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local', 'hit-test'],
    })
      .then((session) => {
        this.startSketch(session);
      }, (error) => {
        console.log(`${error} unable to request an immersive-ar session.`);
      });
  }

  onRequestSession() {
    this.gl = this.canvas.getContext('webgl', {
      xrCompatible: true,
    });
    this.gl.makeXRCompatible().then(() => {
      this.xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(this.xrSession, this.gl) });
    });

    this.xrSession.requestReferenceSpace('viewer').then((refSpace) => {
      this.xrViewerSpace = refSpace;
      this.xrSession.requestHitTestSource({ space: this.xrViewerSpace }).then((hitTestSource) => {
        this.xrHitTestSource = hitTestSource;
      });
    });

    this.xrSession.requestReferenceSpace('local')
      .then((refSpace) => {
        this.xrRefSpace = refSpace;
        // Inform the session that we're ready to begin drawing.
        this.xrSession.requestAnimationFrame(this.onXRFrame.bind(this));
      });
  }
}
