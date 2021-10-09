/**
 * This class provides a set of methods to draw highly customized lines in both floor plan and space-time views of the IGS.
 * Many of the methods address specific browser constraints and balance drawing curves efficiently and aesthetically meaningfully
 * For example, using the "line" method in a library like P5 is inefficient and curveVertex increases efficiency tremendously but 
 * the tradeoff is more customized methods and conditional structures to handle starting/begining lines/shapes
 */
class DrawMovement {

    constructor(sketch) {
        this.sk = sketch;
        this.testPoint = new TestPoint(this.sk);
        this.dot = null; // represents user selection dot drawn in both floor plan and space-time views
        this.style = {
            shade: null,
            thinStroke: null,
            fatStroke: null,
            colorByPaths: this.testPoint.getColorMode() // boolean indicating whether to color by paths or codes
        }
    }

    setData(path) {
        this.dot = null; // reset 
        this.setStartingStyles(path.color);
        this.setDraw(this.sk.PLAN, path.movement);
        this.setDraw(this.sk.SPACETIME, path.movement);
        if (this.dot !== null) this.drawDot(this.dot);
    }

    /**
     * Organizes segmentation of line drawing based on a variety of conditions
     * There are 2 primary ways to start/end lines:
     * 1) User loaded codes are tested to draw distinct line segments that can be separated in space and time
     * 2) isFatLine boolean is based on what points are either selected by a user in the GUI OR indicate if a 
     * point is stopped or moving this boolean is tested to draw distinct line segments adjacent in space and time
     * @param  {Integer} view
     * @param  {MovementPoint []} movementArray
     */
    setDraw(view, movementArray) {
        let isDrawingCode = false; // controls beginning/ending lines based on codes that have been loaded
        for (let i = 1; i < movementArray.length; i++) { // start at 1 to allow testing of current and prior indices
            const p = this.createComparePoint(view, movementArray[i], movementArray[i - 1]); // a compare point consists of current and prior augmented points
            if (this.testPoint.isShowingInGUI(p.cur.pos.timelineXPos)) {
                if (p.cur.codeIsShowing) {
                    if (view === this.sk.SPACETIME) this.recordDot(p.cur.pos);
                    if (!isDrawingCode) isDrawingCode = this.beginNewCodeDrawing(p.cur.isFatLine, p.cur.point.codes.color);
                    if (this.testPoint.isPlanViewAndStopped(view, p.cur.point.isStopped)) this.drawStopCircle(p); // you are able to draw circles between begin/end shape
                    else this.setFatLineDrawing(p);
                } else {
                    if (isDrawingCode) isDrawingCode = this.endCurCodeDrawing();
                }
            }
        }
        this.sk.endShape(); // end shape in case still drawing
    }

    /**
     * Begins drawing shape based on code segmentation
     * Sets strokeweight based on current state of isFatLine and returns value to update isDrawingCode
     */
    beginNewCodeDrawing(isFatLine, color) {
        if (isFatLine) this.setLineStyle(this.style.fatStroke, color);
        else this.setLineStyle(this.style.thinStroke, color);
        this.sk.beginShape();
        return true;
    }

    /**
     * Ends drawing shape based on code segmentation and returns value to update isDrawingCode
     */
    endCurCodeDrawing() {
        this.sk.endShape();
        return false;
    }

    /**
     * Organizes start/ending of new line based on changes in isFatLine or codes
     */
    setFatLineDrawing(p) {
        if (p.cur.isFatLine) {
            if (!p.prior.isFatLine || this.isNewCode(p)) this.endThenBeginNewLine(p.prior.pos, this.style.fatStroke, p.cur.point.codes.color);
            else this.sk.vertex(p.cur.pos.viewXPos, p.cur.pos.floorPlanYPos, p.cur.pos.zPos); // if already drawing fat line, continue it
        } else {
            if (p.prior.isFatLine || this.isNewCode(p)) this.endThenBeginNewLine(p.prior.pos, this.style.thinStroke, p.cur.point.codes.color);
            else this.sk.vertex(p.cur.pos.viewXPos, p.cur.pos.floorPlanYPos, p.cur.pos.zPos); // if already drawing thin line, continue it
        }
    }

    isNewCode(p) {
        return p.cur.point.codes.color !== p.prior.point.codes.color;
    }

    /**
     * Ends and begins a new line, passes values to set strokeweight and color for new line
     * @param  {Object returned from getScaledPos} pos
     * @param  {Integer} weight
     */
    endThenBeginNewLine(pos, weight, color) {
        this.sk.vertex(pos.viewXPos, pos.floorPlanYPos, pos.zPos);
        this.sk.endShape();
        this.setLineStyle(weight, color);
        this.sk.beginShape();
        this.sk.vertex(pos.viewXPos, pos.floorPlanYPos, pos.zPos);
    }


    /**
     * Stops are drawn as circles. These circles can be drawn while also drawing with P5's curveVertex method
     * Testing if the priorPoit is stopped is to only draw a stop once
     * @param  {ComparePoint} p
     */
    drawStopCircle(p) {
        if (!p.prior.point.isStopped) {
            this.setFillStyle(p.cur.point.codes.color);
            this.sk.circle(p.cur.pos.viewXPos, p.cur.pos.floorPlanYPos, 9);
            this.sk.noFill();
        }
    }

    /**
     * A compare point augments current and prior points with screen pixel position variables and booleans indicating if the point passes code and selection tests
     * @param  {Integer} view
     * @param  {MovementPoint} curIndex 
     * @param  {MovementPoint} priorIndex 
     */
    createComparePoint(view, curIndex, priorIndex) {
        return {
            cur: this.augmentPoint(view, curIndex),
            prior: this.augmentPoint(view, priorIndex)
        }
    }

    augmentPoint(view, point) {
        const pos = this.testPoint.getScaledPos(point, view);
        return {
            point,
            pos,
            codeIsShowing: this.testPoint.isShowingInCodeList(point.codes.array),
            isFatLine: this.testPoint.selectModeForFatLine(pos, point.isStopped)
        }
    }

    /**
     * Tests if newDot has been created and updates current dot value and video scrub variable if so
     * @param  {Object returned from getScaledPos} curPos
     */
    recordDot(curPos) {
        const newDot = this.testPoint.getNewDot(curPos, this.dot);
        if (newDot !== null) {
            this.dot = newDot;
            this.sk.sketchController.setDotTimeForVideoScrub(this.dot.timePos);
        }
    }

    drawDot(curDot) {
        const dotSize = this.sk.width / 50;
        this.drawFloorPlanDot(curDot, dotSize);
        if (this.sk.sketchController.handle3D.getIsShowing()) this.draw3DSpaceTimeDot(curDot);
        else this.sk.circle(curDot.timePos, curDot.yPos, dotSize);
    }

    drawFloorPlanDot(curDot, dotSize) {
        this.sk.stroke(0);
        this.sk.strokeWeight(5);
        this.setFillStyle(this.sk.COLORGRAY);
        this.sk.circle(curDot.xPos, curDot.yPos, dotSize);
    }

    draw3DSpaceTimeDot(curDot) {
        this.setLineStyle(25, this.sk.COLORGRAY);
        this.sk.point(curDot.xPos, curDot.yPos, curDot.zPos);
        this.sk.strokeWeight(2);
        this.sk.line(curDot.xPos, curDot.yPos, 0, curDot.xPos, curDot.yPos, curDot.zPos);
    }

    setStartingStyles(color) {
        this.sk.noFill(); // IMPORTANT for curveVertex drawing
        this.style.shade = color;
        [this.style.thinStroke, this.style.fatStroke] = this.testPoint.selectModeForStrokeWeights();
    }

    setLineStyle(weight, color) {
        this.sk.strokeWeight(weight);
        if (this.style.colorByPaths) this.sk.stroke(this.style.shade);
        else this.sk.stroke(color);
    }

    setFillStyle(color) {
        if (this.style.colorByPaths) this.sk.fill(this.style.shade);
        else this.sk.fill(color);
    }
}