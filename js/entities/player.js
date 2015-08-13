/**
 * Player Entity
 */
game.PlayerEntity = me.Entity.extend({

    /**
     * constructor
     */
    init:function (x, y, settings) {
        // call the constructor
        this._super(me.Entity, 'init', [x, y , settings]);
        this.name = 'player';

        // shift sprite so that collision box is its bottom
        this.renderable.translate(0, -4);

        // viewport must follow the player
        me.game.viewport.follow(this.pos, me.game.viewport.AXIS.BOTH);

        // we set the velocity of the player's body
        this.body.setVelocity(2, 9);

        // we always update the player, ALWAYS
        this.alwaysUpdate = true;

        // setting constants
        this.onAirTime = 100;
        this.JUMP_MAX_AIRBONRNE_TIME = 80;
        this.FLICKERING_TIME = 500;

        // setting initial direction
        this.direction = new me.Vector2d(1, 0);
        this.knockbacked = false;

        // animations
        this.renderable.addAnimation('idle', [0, 1, 2], 150);
        this.renderable.addAnimation('walk', [3, 4, 5, 6, 7, 8], 100);
        this.renderable.addAnimation('run', [9, 10, 11, 12, 13, 14], 70);
        this.renderable.addAnimation('jump', [15, 16], 50);
        this.renderable.addAnimation('fall', [18, 19], 50);
        this.renderable.addAnimation('kick', [20, 21, 21, 21], 50);
        this.renderable.addAnimation('stun', [23, 24, 23, 24, 23, 24], 50); // Must blink
        this.renderable.addAnimation('win', [25, 26, 27, 26], 120);
        this.setCurrentAnimation('idle');
    },

    setCurrentAnimation: function(name, onComplete) {
        if (!this.renderable.isCurrentAnimation(name)) {
            this.renderable.setCurrentAnimation(name, onComplete);
        }
    },

    flipX: function(flipX) {
        // XXX Should we prevent flipping when kicking or move the kick collision shape?
        if (!this.kicking) {
            this.renderable.flipX(flipX);
        }
    },

    /**
     * knocks the player back
     */
     knockback: function (strength, direction) {
         // set state as currently knockbacked
         this.knockbacked = true;

         // set default strength
         strength = strength || 2;
         direction = direction || this.direction;

        // change the velocity
        this.body.vel.add(new me.Vector2d(-strength * 10 * direction.x, -strength));
    },

    /**
     * kick
     */
    kick: function() {
        if (!this.kicking) {
            this.kicking = true;
            this.body.addShape(new me.Rect(
                this.direction.x < 0 ? -20 : 20,
                15,
                17,
                7
            ));
        }
    },

    /**
     * hit
     */
     hit: function() {
        this.renderable.flicker(this.FLICKERING_TIME);
     },

    /**
     * update the entity
     */
    update : function (dt) {
        // handling movement on the side
        if(!this.knockbacked) {
            if (me.input.isKeyPressed('left')) {
                this.flipX(true);
                this.body.vel.x -= this.body.accel.x * me.timer.tick;
                this.direction = new me.Vector2d(-1, 0);
            } else if (me.input.isKeyPressed('right')) {
                this.flipX(false);
                this.body.vel.x += this.body.accel.x * me.timer.tick;
                this.direction = new me.Vector2d(1, 0);
            } else {
                this.body.vel.x = 0;
            }
        }

        //handling jump
        if (me.input.isKeyPressed('jump')) {
            if (!this.body.jumping &&
                !this.body.knockbacked &&
                (!this.body.falling ||
                 this.onAirTime < this.JUMP_MAX_AIRBONRNE_TIME)) {
                this.body.vel.y = -this.body.maxVel.y * me.timer.tick;
                this.body.jumping = true;
            }
        }
        this.onAirTime += dt;
        if (!this.body.falling && !this.body.jumping) {
            this.onAirTime = 0;
        }

        // apply physics to the body (this moves the entity)
        this.body.update(dt);

        // handle collisions against other shapes
        me.collision.check(this);

        // enable kicking
        if(me.input.isKeyPressed('kick')) {
            if(!this.knockbacked) {
                this.kick();
            }
        }

        // update animation
        if(!this.kicking){
            if (this.knockbacked) {
                this.setCurrentAnimation('stun');
            } else if (this.body.jumping) {
                this.setCurrentAnimation('jump');
            } else if (this.body.falling) {
                this.setCurrentAnimation('fall');
            } else if (this.body.vel.x !== 0) {
                this.setCurrentAnimation('walk');
            } else {
                this.setCurrentAnimation('idle');
            }
        } else {
            this.setCurrentAnimation('kick', (function() {
                this.kicking = false;
                this.body.removeShapeAt(1);
            }).bind(this));
        }

        // return true if we moved or if the renderable was updated
        return (this._super(me.Entity, 'update', [dt]) ||
                this.body.vel.x !== 0 ||
                this.body.vel.y !== 0);
    },

   /**
     * colision handler
     * (called when colliding with other objects)
     */
    onCollision : function (response, other) {
        var myShapeIndex = response.a.name === this.name ? response.indexShapeA
                                                         : response.indexShapeB;
        var otherShapeIndex = response.a.name === other.name ? response.indexShapeA
                                                              : response.indexShapeB;


        // kick collision shape must not be solid
        if (myShapeIndex > 0) {
            return false;
        }

        // handling custom collision
        if (other.name === 'ball') {
            // TODO if jumping ON ball, must `return true` to have a collision
            return false;
        }
        else if(other.name === 'piglet') {
            other.rescue();
            return false;
        }
        else if(other.name == 'boar') {
            //if our body (not the foot) touches the boar
            if(myShapeIndex == 0) {
                //if we touch its damage hitbox
                if(otherShapeIndex == 0) {
                    //If we're not invincible and not stunned
                    if(!this.renderable.isFlickering() && !other.stunned) {
                        //giving priority over stunning. way better
                        if(!me.collision.shouldCollide(this, other.body.getShape(1))) {
                            this.body.vel = new me.Vector2d(0, 0);
                            this.hit();
                            this.knockback(8, new me.Vector2d(
                                (other.pos.x - this.pos.x) > 0 ? 1 : -1,
                                0
                            ));
                        }
                    }
                    return !this.renderable.isFlickering();
                }
                //if we touch the weakpoint hitbox (tl;dr the head)
                else {
                    var relativeOverlapV = response.overlapV.clone().scale(this.name == response.a.name ? 1 : 0);
                    if(relativeOverlapV.y > 0) {
                        if((this.bottom - relativeOverlapV.y) < other.top) {
                            //we bounce on the head
                            if(!other.stunned)
                                this.body.vel = (new me.Vector2d(
                                    -8 * 10 * (other.pos.x - this.pos.x) > 0 ? 1 : -1,
                                    -8));
                            other.stun();
                        }
                    }
                    return !other.stunned;
                }
            }
            else
                return true;
        }
        else {
            //we're not knockbacked anymore
            this.knockbacked = false;
        }

        // Make all other objects solid
        return true;
    }
});
