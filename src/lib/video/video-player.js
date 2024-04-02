/**
 * A global videoPlayer object acts as an abstract class for all Player sub-classes
 * All Player classes must implement the following methods: seekTo(time), play(), pause(), mute(), unMute(), getCurrentTime(), getVideoDuration(), destroy(), show(), hide()
 */
export class YoutubePlayer {
    /**
     * Include the following script in head of the format: <script type = "text/javascript" src = "https://www.youtube.com/iframe_api"> < /script>
     * @param  {videoId: 'your_videoId_here'} params
     */
    constructor(sketch, params) {
        this.sk = sketch;
        this.targetId = 'moviePlayer';
        this.selectId = '#moviePlayer';
        this.videoId = params['videoId'];
        this.duration = null;
        this.videoWidth = this.sk.width / 5; // these dimensions work nicely for example data
        this.videoHeight = this.sk.width / 7;
        this.increment = 25;
        this.movie = this.sk.createDiv();
        this.setMovieDiv();
        this.initializePlayer();
    }

    setMovieDiv() {
        this.movie.id(this.targetId);
        this.movie.size(this.videoWidth, this.videoHeight);
        this.movie.position(0, 0);
    }


    initializePlayer() {
        this.player = new YT.Player(this.targetId, {
            videoId: this.videoId,
            playerVars: {
                controls: 0, // hides controls on the video
                disablekb: 1, // disables keyboard controls on the video
                playsinline: 1 // plays inline for mobile browsers not fullscreen
            },
            events: {
                'onReady': () => {
                    console.log("YT player ready: ");
                    this.duration = this.player.getDuration();
                    this.sk.videoController.videoPlayerReady();
                }
            }
        });
    }

    show() {
        document.querySelector(this.selectId).style.display = 'block';
    }

    hide() {
        document.querySelector(this.selectId).style.display = 'none';
    }

    seekTo(time) {
        this.player.seekTo(time, true);
    }

    play() {
        this.player.playVideo();
    }

    pause() {
        this.player.pauseVideo();
    }

    mute() {
        this.player.mute();
    }

    unMute() {
        this.player.unMute();
    }

    getCurrentTime() {
        return this.player.getCurrentTime();
    }

    getVideoDuration() {
        return this.duration;
    }

    updatePos(mouseX, mouseY, top, bottom) {
        const xPos = this.sk.constrain(mouseX, this.videoWidth, this.sk.width);
        const yPos = this.sk.constrain(mouseY, top, bottom - this.videoHeight);
        this.sk.select(this.selectId).position(xPos - this.videoWidth, yPos);
    }

    increaseSize() {
        this.videoHeight = (this.videoHeight / this.videoWidth) * (this.videoWidth + this.increment);
        this.videoWidth += this.increment;
        this.sk.select(this.selectId).size(this.videoWidth, this.videoHeight);
    }

    decreaseSize() {
        this.videoHeight = (this.videoHeight / this.videoWidth) * (this.videoWidth - this.increment);
        this.videoWidth -= this.increment;
        this.sk.select(this.selectId).size(this.videoWidth, this.videoHeight);
    }

    destroy() {
        this.player.destroy(); // destroy the player object
        this.movie.remove(); // remove the div element
    }
}

export class P5FilePlayer {

    /**
     * @param  {fileName: 'your_fileLocation_here'} params
     */
    constructor(sketch, params) {
        this.sk = sketch;
        this.targetId = 'moviePlayer';
        this.selectId = '#moviePlayer';
        this.duration = null;
        this.videoWidth = null;
        this.videoHeight = null;
        this.increment = 25; //for increasing and decreasing video size
        this.isOver = false; // used internally to test if user selected movie element
        this.movie = this.sk.createVideo(params['fileName'], () => {
            console.log("File Player Ready:");
            this.setMovieDiv();
            this.sk.videoController.videoPlayerReady();
        });
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.dragBar = null;
      }


    setMovieDiv() {
        this.movie.id(this.targetId);
        this.videoWidth = this.sk.width / 5; // nice starting width for all loaded videos
        this.videoHeight = (this.movie.height / this.movie.width) * this.videoWidth; // scale height proportional to original aspect ratio
        this.movie.size(this.videoWidth, this.videoHeight);
        this.duration = this.movie.duration();
        this.movie.position(0, 0);
        this.movie.mousePressed(() => {
            this.isOver = true;
        });
        this.movie.mouseReleased(() => {
            this.isOver = false;
        });
        this.movie.mouseOver(() => {
            this.sk.select(this.selectId).style('cursor', 'grab'); // set mouse cursor style--this overrides any P5 cursor styles set in draw loop
        });
        this.movie.mousePressed(() => {
            if (this.isOver) {
              this.isDragging = true;
            }
          });
          this.movie.mouseReleased(() => {
            this.isDragging = false;
            this.isResizing = false;
          });
          this.movie.mouseMoved(() => {
            this.showResizeHandles();
            this.showDragBar();
          });
        }

        showResizeHandles() {
            // Check if mouse is hovering over the video
            if (this.isOver) {
              // Show resize handles based on mouse position
              const handleSize = 10;
              const xPos = this.movie.position().x;
              const yPos = this.movie.position().y;
              const width = this.movie.width;
              const height = this.movie.height;

              // Calculate the positions of the resize handles
              const leftHandleX = xPos;
              const rightHandleX = xPos + width - handleSize;
              const topHandleY = yPos;
              const bottomHandleY = yPos + height - handleSize;

              // Create or update the resize handles
              if (!this.resizeHandles) {
                this.resizeHandles = {
                  left: this.sk.createDiv(),
                  right: this.sk.createDiv(),
                };
              }

              // Style and position the resize handles
              this.resizeHandles.left.style('background-color', 'white');
              this.resizeHandles.left.style('border-radius', '50%');
              this.resizeHandles.left.style('width', `${handleSize}px`);
              this.resizeHandles.left.style('height', `${handleSize}px`);
              this.resizeHandles.left.position(leftHandleX, (topHandleY + bottomHandleY) / 2);

              this.resizeHandles.right.style('background-color', 'white');
              this.resizeHandles.right.style('border-radius', '50%');
              this.resizeHandles.right.style('width', `${handleSize}px`);
              this.resizeHandles.right.style('height', `${handleSize}px`);
              this.resizeHandles.right.position(rightHandleX, (topHandleY + bottomHandleY) / 2);
            } else {
              // Hide resize handles
              if (this.resizeHandles) {
                this.resizeHandles.left.remove();
                this.resizeHandles.right.remove();
                this.resizeHandles = null;
              }
            }
          }

          showDragBar() {
            // Check if mouse is hovering over the video
            if (this.isOver) {
              // Show drag bar
              const barHeight = 5;
              const xPos = this.movie.position().x;
              const yPos = this.movie.position().y + this.movie.height;
              const width = this.movie.width;

              // Create or update the drag bar
              if (!this.dragBar) {
                this.dragBar = this.sk.createDiv();
              }

              // Style and position the drag bar
              this.dragBar.style('background-color', 'white');
              this.dragBar.style('height', `${barHeight}px`);
              this.dragBar.style('width', `${width}px`);
              this.dragBar.position(xPos, yPos);
            } else {
              // Hide drag bar
              if (this.dragBar) {
                this.dragBar.remove();
                this.dragBar = null;
              }
            }
          }

    show() {
        let element = document.querySelector(this.selectId);
        element.style.display = 'block';
    }

    hide() {
        let element = document.querySelector(this.selectId);
        element.style.display = 'none';
    }

    seekTo(t) {
        this.movie.time(t);
    }

    play() {
        this.movie.play();
    }

    pause() {
        this.movie.pause();
    }

    mute() {
        this.movie.volume(0);
    }

    unMute() {
        this.movie.volume(1);
    }

    getCurrentTime() {
        return this.movie.time();
    }

    getVideoDuration() {
        return this.duration;
    }

    updatePos(mouseX, mouseY, top, bottom) {
        if (this.isDragging) {

            const xPos = this.sk.constrain(mouseX, this.videoWidth / 2, this.sk.width - this.videoWidth / 2);
            const yPos = this.sk.constrain(mouseY, top + this.videoHeight / 2, bottom - this.videoHeight / 2);
            if (this.isOver) this.sk.select(this.selectId).position(xPos - this.videoWidth / 2, yPos - this.videoHeight / 2);
        }
    }

    increaseSize() {
        this.videoHeight = (this.videoHeight / this.videoWidth) * (this.videoWidth + this.increment);
        this.videoWidth += this.increment;
        this.sk.select(this.selectId).size(this.videoWidth, this.videoHeight);
    }

    decreaseSize() {
        this.videoHeight = (this.videoHeight / this.videoWidth) * (this.videoWidth - this.increment);
        this.videoWidth -= this.increment;
        this.sk.select(this.selectId).size(this.videoWidth, this.videoHeight);
    }

    destroy() {
        this.movie.remove(); // remove the div element
    }
}