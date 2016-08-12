//
// RangeSlider component.
//
// - [Props](#props)
// - [Defaults](#defaults)
// - [Built-in builders](#builders)
//
// Created by awaidman on 16/1/21.
//

import React, {
  Component,
  PropTypes,
} from 'react';

import {
  Text,
  Animated,
  PanResponder,
  View,
} from 'react-native';

// Color of the thumb when lowest value is chosen
const LOWEST_VALUE_THUMB_COLOR = 'white';

// The max scale of the thumb
const THUMB_SCALE_RATIO = 1.3;
const THUMB_SMALL_SCALE_RATIO = 1 / 6;

// Width of the thumb border
const THUMB_BORDER_WIDTH = 0;

// extra spacing enlarging the touchable area
const TRACK_EXTRA_MARGIN_H = 0;

// ## <section id='Thumb'>Thumb</section>
// `Thumb` component of the [`Slider`](#Slider).
class Thumb extends Component {
  constructor(props) {
    super(props);
    this.x = 0;  // current x-axis position

    this._trackMarginH = (props.radius + THUMB_BORDER_WIDTH) +
      TRACK_EXTRA_MARGIN_H;
    this.trackLength = 0;
    this._panResponder = {};
    this._leftPos = 0;
    this._animatedLeft = new Animated.Value(0);
    this._animatedScale = new Animated.Value(1);
    this.state = {
      color: this.props.enabledColor,
      borderColor: this.props.enabledColor,
    };

  }

  componentWillMount() {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: (evt) => { this.props.onGrant(this, evt); },
      onPanResponderMove: (evt) => { this.props.onMove(this, evt); },
      onPanResponderRelease: (evt) => { this.props.onEnd(this, evt); },
      onPanResponderTerminate: (evt) => { this.props.onEnd(this, evt); },
    });

    this._onRadiiUpdate(this.props);
  }

  componentDidMount() {
    this._animatedLeft.addListener(this._getOnSliding());
    this.minimize(0);
  }

  componentWillReceiveProps(nextProps) {
    this._onRadiiUpdate(nextProps);
  }

  componentWillUnmount() {
    this._animatedLeft.removeAllListeners();
  }

  // when thumb radii updated, re-calc the dimens
  _onRadiiUpdate(props) {
    this._radii = props.radius;
    this._dia = this._radii * 2;
    this._containerRadii = this._radii + THUMB_BORDER_WIDTH;
    this._containerDia = this._containerRadii * 2;
  }

  // return a memoized function to handle sliding animation events
  _getOnSliding() {
    let prevX = this.x;  // memorize the previous x

    // on sliding of the thumb
    // `value` - the `left` of the thumb, relative to the container
    return ({ value }) => {
      // convert to value relative to the track

      let x = value + this._containerRadii;
      x = this._getLeftPositionOfThumb(x);

      if (prevX <= 0 && x > 0) {
        // leaving the lowest value, scale up the thumb
        this._onExplode();
      } else if (prevX > 0 && x <= 0) {
        // at lowest value, scale down the thumb
        this._onCollapse();
      }

      prevX = x;
    };
  }

  _getLeftPosWhenSmall(barPosition) {
    let basicLeftPos = barPosition - this._containerRadii;
    let furtestPos = basicLeftPos + this._containerDia;
    if (furtestPos > this.trackLength) {
      basicLeftPos = this.trackLength - this._containerDia;
    } else if (basicLeftPos < 0) {
      basicLeftPos = 0;
    } //(this._animatedScale._value - 1)

    return basicLeftPos;
  }

  _getLeftPositionOfThumb(barPosition) { // For a thumb centered on value
    let basicLeftPos = barPosition - this._containerRadii;
    let furtestPos = barPosition + this._containerRadii * this._animatedScale._value;
    let closestPos = basicLeftPos - this._containerRadii * (this._animatedScale._value - 1);
    console.log("x")
    console.log(this._animatedScale._value )
    if (furtestPos > this.trackLength) {
      basicLeftPos = this.trackLength - this._containerRadii * (this._animatedScale._value + 1);
    } else if (closestPos < 0) {
      basicLeftPos = (this._animatedScale._value - 1) * this._containerRadii;
    } //(this._animatedScale._value - 1)

    return basicLeftPos;
  }

  moveToProg(x, trackLength) {
    this.x = x;
    this._leftPos = this._getLeftPosWhenSmall(this.x);
    this.trackLength = trackLength;
    const leftPos = this._getLeftPositionOfThumb(this.x);
    Animated.timing(this._animatedLeft, {
      toValue: leftPos, //- this._containerRadii * this._animatedScale._value,
      duration: 0,
    }).start();
  }

  // animate the sliding
  // `x` - target position, relative to the track
  moveTo(x, trackLength) {
    this.x = x;
    this._leftPos = this._getLeftPosWhenSmall(this.x);
    this.trackLength = trackLength;
    // const x0 = this.x + this._trackMarginH; // Get center of thumb
    const leftPos = this._getLeftPositionOfThumb(this.x);
    Animated.timing(this._animatedScale, {
      toValue: THUMB_SCALE_RATIO,
      duration: 100,
    }).start();
    Animated.timing(this._animatedLeft, {
      toValue: leftPos, //- this._containerRadii * this._animatedScale._value,
      duration: 0,
    }).start();
  }

  minimize(duration) {
    // this.moveToProg(this.x, this.trackLength)
    Animated.timing(this._animatedScale, {
      toValue: THUMB_SMALL_SCALE_RATIO,
      duration: duration,
    }).start();
    Animated.timing(this._animatedLeft, {
      toValue: this.x - this._containerRadii, //- this._containerRadii * this._animatedScale._value,
      duration: duration,
    }).start();
  }

  maximize(duration) {
    if (this._animatedScale._value < 1) {
      const leftPos = this._getLeftPosWhenSmall(this.x);
      Animated.timing(this._animatedScale, {
        toValue: 1,
        duration: duration,
      }).start();
      Animated.timing(this._animatedLeft, {
        toValue: leftPos, //- this._containerRadii * this._animatedScale._value,
        duration: duration,
      }).start();
    }
  }

  // stop sliding
  confirmMoveTo() {
    Animated.timing(this._animatedScale, {
      toValue: 1,
      duration: 100,
    }).start();
    Animated.timing(this._animatedLeft, {
      toValue: this._leftPos, //- this._containerRadii * this._animatedScale._value,
      duration: 100,
    }).start();
  }

  // from 'lowest' to 'non-lowest'
  _onExplode() {
    this.setState({
      borderColor: this.props.enabledColor,
      color: this.props.enabledColor,
    });
  }

  // from 'non-lowest' to 'lowest'
  _onCollapse() {
    this.setState({
      borderColor: this.props.enabledColor,
      color: this.props.enabledColor,
    });
  }

  // Rendering the `Thumb`
  render() {
    return (
      <Animated.View
        style={[  // the outer circle to draw the border
          this.props.style,
          {
            width: this._containerDia,
            height: this._containerDia,
            backgroundColor: this.state.borderColor,
            borderRadius: this._containerRadii,
            position: 'absolute',
            left: this._animatedLeft,
            transform: [
              { scale: this._animatedScale },
            ],
          },
        ]}
        { ...this._panResponder.panHandlers }
        >
      </Animated.View>
    );
  }
}

/*
<View
style={{  // the inner circle
width: this._dia,
height: this._dia,
backgroundColor: this.state.color,
borderRadius: this._radii,
top: THUMB_BORDER_WIDTH,
left: THUMB_BORDER_WIDTH,
}}
/>*/

Thumb.propTypes = {
  // [RN.View Props](https://facebook.github.io/react-native/docs/view.html#props)...
  ...View.propTypes,

  // Callback to handle onPanResponderGrant gesture
  onGrant: PropTypes.func,

  // Callback to handle onPanResponderMove gesture
  onMove: PropTypes.func,

  // Callback to handle onPanResponderRelease/Terminate gesture
  onEnd: PropTypes.func,

  // Color when thumb has no value
  // disabledColor: PropTypes.string,

  // Color when thumb has value
  enabledColor: PropTypes.string,

  // Radius of thumb component
  radius: PropTypes.number,
};

// ## <section id='defaults'>Defaults</section>
Thumb.defaultProps = {
  radius: 6,
};

// ## Public interface
module.exports = Thumb;
