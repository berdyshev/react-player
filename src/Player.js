import React, { Component } from 'react'

import { propTypes, defaultProps } from './props'

const SEEK_ON_PLAY_EXPIRY = 5000

export default class Player extends Component {
  static displayName = 'Player'
  static propTypes = propTypes
  static defaultProps = defaultProps
  mounted = false
  isReady = false
  preloading = false
  startOnPlay = true
  seekOnPlay = null
  componentDidMount () {
    this.mounted = true
    const { url, innerPlayer } = this.props
    if (url) {
      this.player.load(url)
    } else if (innerPlayer.shouldPreload && innerPlayer.shouldPreload(this.props)) {
      this.preloading = true
      this.player.load(innerPlayer.preloadURL)
    }
  }
  componentWillUnmount () {
    if (!this.preloading) {
      this.player.stop()
    }
    this.mounted = false
  }
  componentDidUpdate (prevProps) {
    const { innerPlayer, url, playing, volume, muted, playbackRate } = this.props
    // Invoke player methods based on updated props
    if (prevProps.innerPlayer !== innerPlayer) {
      this.isReady = false
    }
    if (prevProps.url !== url && url) {
      this.seekOnPlay = null
      this.startOnPlay = true
      this.player.load(url, this.isReady)
    }
    if (prevProps.url && !url) {
      this.player.stop()
    }
    if (!prevProps.playing && playing) {
      this.player.play()
    }
    if (prevProps.playing && !playing) {
      this.player.pause()
    }
    if (prevProps.volume !== volume && !muted) {
      this.player.setVolume(volume)
    }
    if (prevProps.muted !== muted) {
      this.player.setVolume(muted ? 0 : volume)
    }
    if (prevProps.playbackRate !== playbackRate && this.player.setPlaybackRate) {
      this.player.setPlaybackRate(playbackRate)
    }
  }
  getCurrentTime () {
    return this.player.getCurrentTime()
  }
  getSecondsLoaded () {
    return this.player.getSecondsLoaded()
  }
  getDuration () {
    return this.player.getDuration()
  }
  seekTo (amount) {
    // When seeking before player is ready, store value and seek later
    if (!this.isReady && amount !== 0) {
      this.seekOnPlay = amount
      setTimeout(() => {
        this.seekOnPlay = null
      }, SEEK_ON_PLAY_EXPIRY)
    }
    if (amount > 0 && amount < 1) {
      // Convert fraction to seconds based on duration
      const duration = this.player.getDuration()
      if (!duration) {
        console.warn('ReactPlayer: could not seek using fraction – duration not yet available')
        return
      }
      this.player.seekTo(duration * amount)
      return
    }
    this.player.seekTo(amount)
  }
  onPlay = () => {
    const { volume, muted, onStart, onPlay, playbackRate } = this.props
    if (this.startOnPlay) {
      if (this.player.setPlaybackRate) {
        this.player.setPlaybackRate(playbackRate)
      }
      this.player.setVolume(muted ? 0 : volume)
      onStart()
      this.startOnPlay = false
    }
    onPlay()
    if (this.seekOnPlay) {
      this.seekTo(this.seekOnPlay)
      this.seekOnPlay = null
    }
    this.onDurationCheck()
  }
  onReady = () => {
    if (!this.mounted) return
    const { onReady, playing } = this.props
    this.isReady = true
    this.loadingSDK = false
    onReady()
    if (playing || this.preloading) {
      this.preloading = false
      if (this.loadOnReady) {
        this.player.load(this.loadOnReady)
        this.loadOnReady = null
      } else {
        this.player.play()
      }
    }
    this.onDurationCheck()
  }
  onEnded = () => {
    const { innerPlayer, loop, onEnded } = this.props
    if (innerPlayer.loopOnEnded && loop) {
      this.seekTo(0)
    }
    onEnded()
  }
  onDurationCheck = () => {
    clearTimeout(this.durationCheckTimeout)
    const duration = this.getDuration()
    if (duration) {
      this.props.onDuration(duration)
    } else {
      this.durationCheckTimeout = setTimeout(this.onDurationCheck, 100)
    }
  }
  ref = player => {
    if (player) {
      this.player = player
    }
  }
  render () {
    const Player = this.props.innerPlayer
    return (
      <Player
        {...this.props}
        ref={this.ref}
        onReady={this.onReady}
        onPlay={this.onPlay}
        onEnded={this.onEnded}
      />
    )
  }
}
