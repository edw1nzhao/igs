class GUI {

    constructor(sketch) {
        this.sk = sketch;
        this.timelinePanel = new TimelinePanel(this.sk);
        this.fpContainer = new FloorPlanContainer(this.sk, this.timelinePanel.getStart(), this.timelinePanel.getEnd(), this.timelinePanel.getHeight());
    }

    updateGUI() {
        this.sk.gui.timelinePanel.draw();
        this.sk.gui.timelinePanel.updateSlicer(this.sk.sketchController.handle3D.getIsShowing());
        this.sk.gui.fpContainer.updateSelectors(this.sk.sketchController.getCurSelectTab());
    }
}