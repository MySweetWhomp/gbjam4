game.PlayScreen = me.ScreenObject.extend({
    /**
     *  action to perform on state change
     */
    onResetEvent: function() {
        // load a level
        me.levelDirector.loadLevel("area01");

        // setting bgm
        //me.audio.playTrack('BGM');

        // add our HUD to the game world
        this.HUD = new game.HUD.Container();
        this.pause = new game.Pause.Container();
        me.game.world.addChild(this.HUD);
        me.game.world.addChild(this.pause);

        game.data.won = false;
        me.input.paused = false;

        me.state.transition('fade', 'rgb(215, 232, 148)', 350);
    },

    /**
     *  action to perform when leaving this screen (state change)
     */
    onDestroyEvent: function() {
        // remove the HUD from the game world
        me.game.world.removeChild(this.HUD);
        me.game.world.removeChild(this.pause);
    }
});
