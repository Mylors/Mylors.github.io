"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Heart,
  Shuffle,
  Repeat,
  Music,
  Waves,
  Zap,
  Upload,
  Mic,
} from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  ArcElement,
} from "chart.js"
import { Bar } from "react-chartjs-2"

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  ArcElement,
)

interface Song {
  id: string
  title: string
  artist: string
  duration: string
  file?: File
  url?: string
  color: string
}

const defaultSongs: Song[] = []

export default function MusicVisualizer() {
  const [songs, setSongs] = useState<Song[]>(defaultSongs)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSong, setCurrentSong] = useState(0)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(75)
  const [isLiked, setIsLiked] = useState(false)
  const [visualizerBars, setVisualizerBars] = useState<number[]>(new Array(32).fill(0))
  const [waveformData, setWaveformData] = useState<number[]>(new Array(50).fill(0))
  const [particles, setParticles] = useState<
    Array<{ x: number; y: number; size: number; opacity: number; velocity: { x: number; y: number } }>
  >([])
  const [isUsingMicrophone, setIsUsingMicrophone] = useState(false)

  // Audio refs
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Initialize Web Audio API
  const initializeAudio = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 128
        analyserRef.current.smoothingTimeConstant = 0.8
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
      }

      if (audioRef.current && !sourceRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current)
        sourceRef.current.connect(analyserRef.current)
        analyserRef.current.connect(audioContextRef.current.destination)
      }
    } catch (error) {
      console.error("Error initializing audio:", error)
    }
  }, [])

  // Start microphone input
  const startMicrophone = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 128
        analyserRef.current.smoothingTimeConstant = 0.8
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micSourceRef.current = audioContextRef.current.createMediaStreamSource(stream)
      micSourceRef.current.connect(analyserRef.current)

      setIsUsingMicrophone(true)
      setIsPlaying(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("No se pudo acceder al micrófono. Por favor, permite el acceso.")
    }
  }, [])

  // Stop microphone
  const stopMicrophone = useCallback(() => {
    if (micSourceRef.current) {
      micSourceRef.current.disconnect()
      micSourceRef.current = null
    }
    setIsUsingMicrophone(false)
    setIsPlaying(false)
  }, [])

  // Analyze audio and update visualizer
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return

    analyserRef.current.getByteFrequencyData(dataArrayRef.current)

    // Convert to percentage for frequency bars
    const bars = Array.from(dataArrayRef.current.slice(0, 32)).map((value) => (value / 255) * 100)
    setVisualizerBars(bars)

    // Create waveform data
    const waveform = Array.from(dataArrayRef.current.slice(0, 50)).map((value) => (value / 255) * 100)
    setWaveformData(waveform)

    // Generate particles based on audio intensity
    const intensity = bars.reduce((sum, bar) => sum + bar, 0) / bars.length
    if (intensity > 15) {
      setParticles((prev) => [
        ...prev.slice(-10),
        {
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.8 + 0.2,
          velocity: {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
          },
        },
      ])
    }

    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }, [])

  // Start/stop audio analysis
  useEffect(() => {
    if (isPlaying && (audioRef.current || isUsingMicrophone)) {
      analyzeAudio()
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, isUsingMicrophone, analyzeAudio])

  // Update particles animation
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((particle) => ({
            ...particle,
            x: particle.x + particle.velocity.x,
            y: particle.y + particle.velocity.y,
            opacity: particle.opacity * 0.98,
          }))
          .filter((particle) => particle.opacity > 0.1),
      )
    }, 50)

    return () => clearInterval(interval)
  }, [])

  // Chart.js configurations
  const frequencyChartData = {
    labels: Array.from({ length: 32 }, (_, i) => `${i * 100}Hz`),
    datasets: [
      {
        label: "Frequency",
        data: visualizerBars,
        backgroundColor: (ctx: any) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400)
          gradient.addColorStop(0, "#8b5cf6")
          gradient.addColorStop(0.5, "#ec4899")
          gradient.addColorStop(1, "#f59e0b")
          return gradient
        },
        borderColor: "#8b5cf6",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const waveformChartData = {
    labels: Array.from({ length: 50 }, (_, i) => i.toString()),
    datasets: [
      {
        label: "Waveform",
        data: waveformData,
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6, 182, 212, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }

  const polarChartData = {
    labels: ["Bass", "Low Mid", "Mid", "High Mid", "Treble"],
    datasets: [
      {
        data: [
          visualizerBars.slice(0, 6).reduce((a, b) => a + b, 0) / 6,
          visualizerBars.slice(6, 12).reduce((a, b) => a + b, 0) / 6,
          visualizerBars.slice(12, 18).reduce((a, b) => a + b, 0) / 6,
          visualizerBars.slice(18, 24).reduce((a, b) => a + b, 0) / 6,
          visualizerBars.slice(24, 32).reduce((a, b) => a + b, 0) / 8,
        ],
        backgroundColor: [
          "rgba(239, 68, 68, 0.6)",
          "rgba(245, 158, 11, 0.6)",
          "rgba(34, 197, 94, 0.6)",
          "rgba(59, 130, 246, 0.6)",
          "rgba(147, 51, 234, 0.6)",
        ],
        borderColor: [
          "rgb(239, 68, 68)",
          "rgb(245, 158, 11)",
          "rgb(34, 197, 94)",
          "rgb(59, 130, 246)",
          "rgb(147, 51, 234)",
        ],
        borderWidth: 2,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
        min: 0,
        max: 100,
      },
    },
    animation: {
      duration: 0,
    },
  }

  const waveformOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
        min: 0,
        max: 100,
      },
    },
    animation: {
      duration: 0,
    },
  }

  const polarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      r: {
        display: false,
        min: 0,
        max: 100,
      },
    },
    animation: {
      duration: 100,
    },
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("audio/")) {
      const newSong: Song = {
        id: Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Local File",
        duration: "0:00",
        file: file,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      }

      setSongs((prev) => [newSong, ...prev])
      setCurrentSong(0)

      // Load the file
      if (audioRef.current) {
        const url = URL.createObjectURL(file)
        audioRef.current.src = url
        audioRef.current.load()
      }
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const newDuration = audioRef.current.duration
      setDuration(newDuration)

      // Update the current song's duration in the songs array
      setSongs((prev) =>
        prev.map((song, index) => (index === currentSong ? { ...song, duration: formatTime(newDuration) } : song)),
      )
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)
    }
  }

  const handleProgressChange = (value: number[]) => {
    if (audioRef.current && duration) {
      const newTime = (value[0] / 100) * duration
      audioRef.current.currentTime = newTime
      setProgress(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (audioRef.current) {
      audioRef.current.volume = value[0] / 100
    }
  }

  const togglePlay = async () => {
    if (isUsingMicrophone) {
      stopMicrophone()
      return
    }

    if (!audioRef.current) return

    try {
      await initializeAudio()

      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume()
      }

      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error("Error playing audio:", error)
      setIsPlaying(false)
    }
  }

  const nextSong = () => {
    const newIndex = (currentSong + 1) % songs.length
    setCurrentSong(newIndex)
    loadSong(newIndex)
  }

  const prevSong = () => {
    const newIndex = (currentSong - 1 + songs.length) % songs.length
    setCurrentSong(newIndex)
    loadSong(newIndex)
  }

  const loadSong = (index: number) => {
    const song = songs[index]
    if (audioRef.current) {
      if (song.file) {
        const url = URL.createObjectURL(song.file)
        audioRef.current.src = url
      } else if (song.url) {
        audioRef.current.src = song.url
      }
      audioRef.current.load()
      setProgress(0)
      setCurrentTime(0)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const currentTrack = songs[currentSong] || {
    id: "default",
    title: "No hay música",
    artist: "Selecciona una canción",
    duration: "0:00",
    color: "#8b5cf6",
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Audio element */}
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={nextSong}
        crossOrigin="anonymous"
      />

      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-pink-900/30"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${currentTrack?.color || "#8b5cf6"}20 0%, transparent 70%)`,
          }}
        />

        {/* Floating Particles */}
        {particles.map((particle, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              transform: `translate(-50%, -50%)`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SoundWave</h1>
              <p className="text-gray-400">Audio Visualizer</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-green-500 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
              {isUsingMicrophone ? "Microphone" : "Audio"}
            </Badge>
          </div>
        </div>

        {/* File Upload, URL Input & Microphone */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1">
            <label className="flex items-center gap-3 p-4 bg-gray-900/50 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-purple-500 transition-colors">
              <Upload className="w-6 h-6 text-purple-400" />
              <div>
                <p className="font-medium">Sube tu música</p>
                <p className="text-sm text-gray-400">MP3, WAV, OGG, M4A</p>
              </div>
              <Input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <Button
            onClick={() => {
              const url = prompt("Ingresa la URL de la música:")
              if (url) {
                const newSong: Song = {
                  id: Date.now().toString(),
                  title: "Música desde URL",
                  artist: "Online",
                  duration: "0:00",
                  url: url,
                  color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                }
                setSongs((prev) => [newSong, ...prev])
                setCurrentSong(0)
                if (audioRef.current) {
                  audioRef.current.src = url
                  audioRef.current.load()
                }
              }
            }}
            className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            Agregar Link
          </Button>

          <Button
            onClick={isUsingMicrophone ? stopMicrophone : startMicrophone}
            className={`px-6 ${
              isUsingMicrophone
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            }`}
          >
            <Mic className="w-5 h-5 mr-2" />
            {isUsingMicrophone ? "Detener Mic" : "Usar Micrófono"}
          </Button>
        </div>

        {/* Main Player */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Album Art & Info */}
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="relative mb-6">
                <div
                  className="w-full aspect-square rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden"
                  style={{
                    boxShadow: `0 0 60px ${currentTrack?.color || "#8b5cf6"}40`,
                  }}
                >
                  {/* Rotating vinyl effect */}
                  <div
                    className={`absolute inset-4 rounded-full border-4 border-gray-700 ${isPlaying ? "animate-spin" : ""}`}
                    style={{ animationDuration: "3s" }}
                  >
                    <div className="absolute inset-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-gray-900 rounded-full" />
                  </div>

                  {isUsingMicrophone ? (
                    <Mic className="w-16 h-16 text-green-400 z-10" />
                  ) : (
                    <Music className="w-16 h-16 text-gray-600 z-10" />
                  )}
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">
                  {isUsingMicrophone ? "Entrada de Micrófono" : currentTrack.title}
                </h2>
                <p className="text-gray-400 text-lg mb-4">
                  {isUsingMicrophone ? "Audio en vivo" : currentTrack.artist}
                </p>

                {/* Progress Bar */}
                {!isUsingMicrophone && (
                  <div className="space-y-2 mb-6">
                    <Slider
                      value={[progress]}
                      onValueChange={handleProgressChange}
                      max={100}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  {!isUsingMicrophone && (
                    <>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Shuffle className="w-5 h-5" />
                      </Button>

                      <Button variant="ghost" size="sm" onClick={prevSong} className="text-gray-400 hover:text-white">
                        <SkipBack className="w-6 h-6" />
                      </Button>
                    </>
                  )}

                  <Button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </Button>

                  {!isUsingMicrophone && (
                    <>
                      <Button variant="ghost" size="sm" onClick={nextSong} className="text-gray-400 hover:text-white">
                        <SkipForward className="w-6 h-6" />
                      </Button>

                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Repeat className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Volume & Like */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-gray-400" />
                    <Slider value={[volume]} onValueChange={handleVolumeChange} max={100} step={1} className="w-24" />
                  </div>

                  {!isUsingMicrophone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsLiked(!isLiked)}
                      className={isLiked ? "text-red-500" : "text-gray-400 hover:text-red-500"}
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audio Visualizer */}
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Waves className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl font-semibold">Audio Visualizer</h3>
                {isPlaying && (
                  <Badge variant="outline" className="border-green-500 text-green-400 animate-pulse">
                    LIVE
                  </Badge>
                )}
              </div>

              {/* Frequency Spectrum */}
              <div className="h-64 mb-6 bg-black/30 rounded-xl p-4">
                <div className="h-full">
                  <Bar data={frequencyChartData} options={chartOptions} />
                </div>
              </div>

              {/* Audio Stats - More user friendly */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-black/20 rounded-lg">
                  <div className="text-lg font-bold text-purple-400">
                    {Math.round(visualizerBars.reduce((a, b) => a + b, 0) / visualizerBars.length)}%
                  </div>
                  <div className="text-xs text-gray-400">Nivel</div>
                </div>
                <div className="text-center p-3 bg-black/20 rounded-lg">
                  <div className="text-lg font-bold text-pink-400">{Math.max(...visualizerBars).toFixed(0)}%</div>
                  <div className="text-xs text-gray-400">Máximo</div>
                </div>
                <div className="text-center p-3 bg-black/20 rounded-lg">
                  <div className="text-lg font-bold text-cyan-400">
                    {visualizerBars
                      .slice(0, 8)
                      .reduce((a, b) => a + b, 0)
                      .toFixed(0)}
                    %
                  </div>
                  <div className="text-xs text-gray-400">Graves</div>
                </div>
                <div className="text-center p-3 bg-black/20 rounded-lg">
                  <div className="text-lg font-bold text-yellow-400">
                    {visualizerBars
                      .slice(24, 32)
                      .reduce((a, b) => a + b, 0)
                      .toFixed(0)}
                    %
                  </div>
                  <div className="text-xs text-gray-400">Agudos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Playlist */}
        {!isUsingMicrophone && (
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-semibold">Playlist</h3>
              </div>

              <div className="space-y-3">
                {songs.map((song, index) => (
                  <div
                    key={song.id}
                    onClick={() => {
                      setCurrentSong(index)
                      loadSong(index)
                    }}
                    className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                      index === currentSong
                        ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30"
                        : "hover:bg-gray-800/50"
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${song.color}20` }}
                    >
                      <Music className="w-6 h-6" style={{ color: song.color }} />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-medium">{song.title}</h4>
                      <p className="text-gray-400 text-sm">{song.artist}</p>
                    </div>

                    <div className="text-gray-400 text-sm">{song.duration}</div>

                    {index === currentSong && isPlaying && (
                      <div className="flex gap-1">
                        {[1, 2, 3].map((bar) => (
                          <div
                            key={bar}
                            className="w-1 bg-purple-500 rounded-full animate-pulse"
                            style={{
                              height: "16px",
                              animationDelay: `${bar * 0.1}s`,
                              animationDuration: "0.6s",
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
