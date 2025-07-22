"use client"

import React from "react"
import { useState, useRef, useCallback, useEffect, type FC } from "react"
import {
  Code,
  Download,
  FileText,
  MousePointerIcon as MousePointerSquare,
  QrCode,
  Trash2,
  Type,
  Upload,
  Barcode,
  Plus,
  Grid3X3,
  Ruler,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface Element {
  id: number
  type: "text" | "barcode" | "qr" | "image"
  x: number
  y: number
  width?: number
  height?: number
  [key: string]: any
}

export default function LabelForge() {
  const [elements, setElements] = useState<Element[]>([])
  const [selectedElement, setSelectedElement] = useState<Element | null>(null)
  const [labelSettings, setLabelSettings] = useState({
    width: 4,
    height: 3,
    unit: "in",
  })
  const [showGrid, setShowGrid] = useState(true)
  const [showRulers, setShowRulers] = useState(true)
  const [generatedCode, setGeneratedCode] = useState("")
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleElementUpdate = (id: number, newProps: Partial<Element>) => {
    const updatedElements = elements.map((el) => (el.id === id ? { ...el, ...newProps } : el))
    setElements(updatedElements)
    if (selectedElement?.id === id) {
      setSelectedElement({ ...selectedElement, ...newProps })
    }
  }

  // Keyboard shortcuts for moving selected element
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElement) return

      // Only handle arrow keys when no input/textarea is focused
      const activeElement = document.activeElement
      if (activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA") {
        return
      }

      const canvasWidth = canvasRef.current?.getBoundingClientRect()?.width || 400
      const canvasHeight = canvasRef.current?.getBoundingClientRect()?.height || 300
      const elementWidth = selectedElement.width || 100
      const elementHeight = selectedElement.height || 20

      // Determine step size (hold Shift for larger steps)
      const stepSize = e.shiftKey ? 10 : 1

      let newX = selectedElement.x
      let newY = selectedElement.y

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          newX = Math.max(0, selectedElement.x - stepSize)
          break
        case "ArrowRight":
          e.preventDefault()
          newX = Math.min(canvasWidth - elementWidth, selectedElement.x + stepSize)
          break
        case "ArrowUp":
          e.preventDefault()
          newY = Math.max(0, selectedElement.y - stepSize)
          break
        case "ArrowDown":
          e.preventDefault()
          newY = Math.min(canvasHeight - elementHeight, selectedElement.y + stepSize)
          break
        case "Delete":
        case "Backspace":
          e.preventDefault()
          deleteElement(selectedElement.id)
          break
        default:
          return
      }

      if (newX !== selectedElement.x || newY !== selectedElement.y) {
        handleElementUpdate(selectedElement.id, { x: newX, y: newY })
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [selectedElement])

  const generateZPLCode = () => {
    let zpl = "^XA\n"
    zpl += `^PW${labelSettings.width * 203}\n` // Assuming 203 dpi
    zpl += `^LL${labelSettings.height * 203}\n`

    elements.forEach((el) => {
      const xPos = Math.round(el.x)
      const yPos = Math.round(el.y)
      switch (el.type) {
        case "text":
          const rotationCode = { 0: "N", 90: "R", 180: "I", 270: "B" }[el.rotation] || "N"
          const fontWeight = Number.parseInt(el.fontWeight || "400") >= 600 ? "B" : "N" // Bold if weight >= 600
          zpl += `^FO${xPos},${yPos}^A0${rotationCode},${el.fontSize * 1.5},${el.fontSize * 1.5}^FD${el.content}^FS\n`
          break
        case "barcode":
          zpl += `^FO${xPos},${yPos}^BY2,3,${el.height}^BCN,,Y,N^FD${el.data}^FS\n`
          break
        case "qr":
          const qrSize = el.width || 64
          zpl += `^FO${xPos},${yPos}^BQN,2,${Math.round(qrSize / 10)}^FDQA,${el.data}^FS\n`
          break
      }
    })

    zpl += "^XZ"
    setGeneratedCode(zpl)
  }

  const createNewElement = (type: "text" | "barcode" | "qr" | "image", x = 20, y = 20): Element => {
    const newElement: Element = {
      id: Date.now(),
      type,
      x,
      y,
    }

    switch (type) {
      case "text":
        newElement.content = "New Text"
        newElement.fontSize = 14
        newElement.fontFamily = "Arial"
        newElement.fontWeight = "400"
        newElement.rotation = 0
        newElement.width = 100
        newElement.height = 20
        break
      case "barcode":
        newElement.data = "12345"
        newElement.barcodeType = "Code 128"
        newElement.width = 120
        newElement.height = 40
        break
      case "qr":
        newElement.data = "https://vercel.com"
        newElement.width = 64
        newElement.height = 64
        break
    }
    return newElement
  }

  const addElement = (type: "text" | "barcode" | "qr" | "image") => {
    const newElement = createNewElement(type)
    setElements([...elements, newElement])
    setSelectedElement(newElement)
  }

  const deleteElement = (id: number) => {
    setElements(elements.filter((el) => el.id !== id))
    if (selectedElement?.id === id) {
      setSelectedElement(null)
    }
  }

  const handleDragStart = (e: React.DragEvent, elementType: string) => {
    e.dataTransfer.setData("elementType", elementType)
    e.dataTransfer.effectAllowed = "copy"
  }

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const elementType = e.dataTransfer.getData("elementType") as "text" | "barcode" | "qr" | "image"

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - (showRulers ? 20 : 0) // Account for ruler offset
      const y = e.clientY - rect.top - (showRulers ? 20 : 0) // Account for ruler offset

      const newElement = createNewElement(elementType, Math.max(0, x), Math.max(0, y))
      setElements([...elements, newElement])
      setSelectedElement(newElement)
    }
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedElement(null)
    }
  }

  const clearCanvas = () => {
    setElements([])
    setSelectedElement(null)
  }

  const loadDesignFromCode = (code: string) => {
    try {
      // Parse ZPL code and extract elements
      const lines = code.split("\n")
      const newElements: Element[] = []
      let labelWidth = 4
      let labelHeight = 3

      lines.forEach((line, index) => {
        // Parse label dimensions
        if (line.startsWith("^PW")) {
          labelWidth = Number.parseInt(line.substring(3)) / 203 // Convert from dots to inches
        }
        if (line.startsWith("^LL")) {
          labelHeight = Number.parseInt(line.substring(3)) / 203 // Convert from dots to inches
        }

        // Parse text elements
        if (line.includes("^FO") && line.includes("^A0")) {
          const foMatch = line.match(/\^FO(\d+),(\d+)/)
          const fdMatch = line.match(/\^FD([^^]+)\^FS/)
          const fontMatch = line.match(/\^A0[NRIB],(\d+),(\d+)/)

          if (foMatch && fdMatch) {
            const element: Element = {
              id: Date.now() + index,
              type: "text",
              x: Number.parseInt(foMatch[1]),
              y: Number.parseInt(foMatch[2]),
              content: fdMatch[1],
              fontSize: fontMatch ? Number.parseInt(fontMatch[1]) / 1.5 : 14,
              fontFamily: "Arial",
              fontWeight: "400",
              rotation: 0,
              width: 100,
              height: 20,
            }
            newElements.push(element)
          }
        }

        // Parse barcode elements
        if (line.includes("^FO") && line.includes("^BC")) {
          const foMatch = line.match(/\^FO(\d+),(\d+)/)
          const fdMatch = line.match(/\^FD([^^]+)\^FS/)
          const byMatch = line.match(/\^BY\d+,\d+,(\d+)/)

          if (foMatch && fdMatch) {
            const element: Element = {
              id: Date.now() + index + 1000,
              type: "barcode",
              x: Number.parseInt(foMatch[1]),
              y: Number.parseInt(foMatch[2]),
              data: fdMatch[1],
              barcodeType: "Code 128",
              width: 120,
              height: byMatch ? Number.parseInt(byMatch[1]) : 40,
            }
            newElements.push(element)
          }
        }

        // Parse QR code elements
        if (line.includes("^FO") && line.includes("^BQ")) {
          const foMatch = line.match(/\^FO(\d+),(\d+)/)
          const fdMatch = line.match(/\^FDQA,([^^]+)\^FS/)

          if (foMatch && fdMatch) {
            const element: Element = {
              id: Date.now() + index + 2000,
              type: "qr",
              x: Number.parseInt(foMatch[1]),
              y: Number.parseInt(foMatch[2]),
              data: fdMatch[1],
              width: 64,
              height: 64,
            }
            newElements.push(element)
          }
        }
      })

      // Update state with parsed elements and dimensions
      setElements(newElements)
      setLabelSettings({
        width: Math.max(labelWidth, 1),
        height: Math.max(labelHeight, 1),
        unit: "in",
      })
      setSelectedElement(null)
    } catch (error) {
      console.error("Error parsing ZPL code:", error)
      alert("Error parsing the provided code. Please check the format and try again.")
    }
  }

  // Calculate canvas dimensions in pixels
  const canvasWidthPx = labelSettings.width * 96 // 96 dpi for screen
  const canvasHeightPx = labelSettings.height * 96

  // Generate grid pattern
  const generateGridPattern = () => {
    const gridSize = 20 // 20px grid
    const lines = []

    // Vertical lines
    for (let x = 0; x <= canvasWidthPx; x += gridSize) {
      lines.push(<line key={`v-${x}`} x1={x} y1={0} x2={x} y2={canvasHeightPx} stroke="#e5e7eb" strokeWidth="0.5" />)
    }

    // Horizontal lines
    for (let y = 0; y <= canvasHeightPx; y += gridSize) {
      lines.push(<line key={`h-${y}`} x1={0} y1={y} x2={canvasWidthPx} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />)
    }

    return lines
  }

  // Generate ruler marks
  const generateRulerMarks = () => {
    const marks = []
    const pixelsPerUnit = labelSettings.unit === "in" ? 96 : 96 / 25.4 // 96 DPI for inches, convert for mm

    // Horizontal ruler marks
    for (let i = 0; i <= Math.ceil(canvasWidthPx / pixelsPerUnit); i++) {
      const x = i * pixelsPerUnit
      if (x <= canvasWidthPx) {
        marks.push(
          <g key={`h-mark-${i}`}>
            <line x1={x} y1={15} x2={x} y2={20} stroke="#6b7280" strokeWidth="1" />
            <text x={x} y={12} fontSize="8" fill="#6b7280" textAnchor="middle" className="select-none">
              {i}
            </text>
          </g>,
        )
      }
    }

    // Vertical ruler marks
    for (let i = 0; i <= Math.ceil(canvasHeightPx / pixelsPerUnit); i++) {
      const y = i * pixelsPerUnit
      if (y <= canvasHeightPx) {
        marks.push(
          <g key={`v-mark-${i}`}>
            <line x1={15} y1={y + 20} x2={20} y2={y + 20} stroke="#6b7280" strokeWidth="1" />
            <text
              x={12}
              y={y + 23}
              fontSize="8"
              fill="#6b7280"
              textAnchor="middle"
              className="select-none"
              transform={`rotate(-90, 12, ${y + 23})`}
            >
              {i}
            </text>
          </g>,
        )
      }
    }

    return marks
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <main className="flex flex-1 overflow-hidden gap-3 p-3">
        {/* Left Floating Sidebar - Toolbox */}
        <aside className="w-64 floating-panel rounded-xl overflow-y-auto panel-font">
          <div className="p-5">
            <div className="mb-6">
              <h1 className="text-xl font-bold gradient-text mb-1">LabelForge</h1>
              <p className="text-xs text-gray-500 font-medium">Professional Label Designer</p>
            </div>

            <h2 className="mb-4 text-base font-bold text-gray-800">Toolbox</h2>
            <div className="space-y-2.5">
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, "text")}
                className="group flex items-center gap-3 p-2.5 bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-lg cursor-grab hover:shadow-md hover:border-purple-200 transition-all duration-300"
              >
                <div className="p-1.5 gradient-bg rounded-md group-hover:scale-110 transition-transform duration-200">
                  <Type className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Add Text</span>
              </div>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, "barcode")}
                className="group flex items-center gap-3 p-2.5 bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-lg cursor-grab hover:shadow-md hover:border-purple-200 transition-all duration-300"
              >
                <div className="p-1.5 gradient-bg rounded-md group-hover:scale-110 transition-transform duration-200">
                  <Barcode className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Add Barcode</span>
              </div>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, "qr")}
                className="group flex items-center gap-3 p-2.5 bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-lg cursor-grab hover:shadow-md hover:border-purple-200 transition-all duration-300"
              >
                <div className="p-1.5 gradient-bg rounded-md group-hover:scale-110 transition-transform duration-200">
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Add QR Code</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300 rounded-lg opacity-60 cursor-not-allowed">
                <div className="p-1.5 bg-gray-400 rounded-md">
                  <Upload className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-500">Upload Image</span>
              </div>
            </div>

            <h2 className="mt-8 mb-4 text-base font-bold text-gray-800">View Options</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Show Grid</span>
                </div>
                <Button
                  variant={showGrid ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                  className={cn(
                    "h-6 px-2 text-xs",
                    showGrid
                      ? "gradient-bg text-white hover:opacity-90"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {showGrid ? "ON" : "OFF"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Show Rulers</span>
                </div>
                <Button
                  variant={showRulers ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowRulers(!showRulers)}
                  className={cn(
                    "h-6 px-2 text-xs",
                    showRulers
                      ? "gradient-bg text-white hover:opacity-90"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {showRulers ? "ON" : "OFF"}
                </Button>
              </div>
            </div>

            <h2 className="mt-8 mb-4 text-base font-bold text-gray-800">Label Settings</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label htmlFor="label-width" className="text-sm font-semibold text-gray-700">
                    Width
                  </Label>
                  <Input
                    id="label-width"
                    type="number"
                    step="0.1"
                    value={labelSettings.width}
                    onChange={(e) =>
                      setLabelSettings({
                        ...labelSettings,
                        width: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 text-sm bg-white/70 border-gray-200 focus:border-purple-300 transition-colors h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="label-height" className="text-sm font-semibold text-gray-700">
                    Height
                  </Label>
                  <Input
                    id="label-height"
                    type="number"
                    step="0.1"
                    value={labelSettings.height}
                    onChange={(e) =>
                      setLabelSettings({
                        ...labelSettings,
                        height: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 text-sm bg-white/70 border-gray-200 focus:border-purple-300 transition-colors h-8"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="label-unit" className="text-sm font-semibold text-gray-700">
                  Unit
                </Label>
                <Select
                  value={labelSettings.unit}
                  onValueChange={(value) => setLabelSettings({ ...labelSettings, unit: value })}
                >
                  <SelectTrigger id="label-unit" className="mt-1 text-sm bg-white/70 border-gray-200 h-8">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Inches (in)</SelectItem>
                    <SelectItem value="mm">Millimeters (mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={clearCanvas}
                className="w-full text-sm h-8 border-gray-300 text-gray-600 hover:bg-gray-50 bg-transparent"
              >
                Clear Canvas
              </Button>
            </div>

            <h2 className="mt-8 mb-4 text-base font-bold text-gray-800">Actions</h2>
            <div className="space-y-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full text-sm h-8 border-gray-300 text-gray-600 hover:bg-gray-50 bg-transparent"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Load Design
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl floating-panel border-0 panel-font">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold gradient-text">Load Design from Code</DialogTitle>
                  </DialogHeader>
                  <LoadDesignDialog onLoadDesign={loadDesignFromCode} />
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    className="w-full gradient-bg text-white hover:opacity-90 transition-opacity text-sm h-8"
                    onClick={generateZPLCode}
                  >
                    <Code className="w-4 h-4 mr-2" />
                    Generate Code
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl floating-panel border-0 panel-font">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold gradient-text">Generated Printer Code</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="printer-language" className="text-sm font-semibold text-gray-700">
                        Printer Language
                      </Label>
                      <Select defaultValue="zpl">
                        <SelectTrigger id="printer-language" className="mt-1 text-sm bg-white/70 border-gray-200 h-8">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zpl">ZPL (Zebra)</SelectItem>
                          <SelectItem value="epl" disabled>
                            EPL (Eltron)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      readOnly
                      value={generatedCode}
                      className="h-64 code-font text-xs bg-gray-900 text-green-400 border-gray-700 resize-none"
                      placeholder="Generated code will appear here..."
                    />
                    <Button
                      onClick={() => navigator.clipboard.writeText(generatedCode)}
                      className="w-full gradient-bg text-white hover:opacity-90 transition-opacity text-sm h-8"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Keyboard Shortcuts Help */}
            <div className="mt-8 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Keyboard Shortcuts</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Move element:</span>
                  <span className="font-mono">Arrow keys</span>
                </div>
                <div className="flex justify-between">
                  <span>Move faster:</span>
                  <span className="font-mono">Shift + Arrow</span>
                </div>
                <div className="flex justify-between">
                  <span>Delete element:</span>
                  <span className="font-mono">Delete/Backspace</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Column - Design Canvas */}
        <div className="flex-1 flex items-center justify-center p-12 overflow-auto">
          <div className="relative">
            {/* Canvas Container with Rulers */}
            <div
              className="relative bg-white border border-gray-300 overflow-visible"
              style={{
                marginLeft: showRulers ? "20px" : "0",
                marginTop: showRulers ? "20px" : "0",
              }}
            >
              {/* Rulers */}
              {showRulers && (
                <svg
                  className="absolute pointer-events-none"
                  style={{
                    left: -20,
                    top: -20,
                    width: canvasWidthPx + 20,
                    height: canvasHeightPx + 20,
                  }}
                >
                  {/* Ruler backgrounds */}
                  <rect x="0" y="0" width="20" height="20" fill="#f3f4f6" />
                  <rect x="20" y="0" width={canvasWidthPx} height="20" fill="#f9fafb" />
                  <rect x="0" y="20" width="20" height={canvasHeightPx} fill="#f9fafb" />

                  {/* Unit label in corner */}
                  <text
                    x="10"
                    y="12"
                    fontSize="8"
                    fill="#6b7280"
                    textAnchor="middle"
                    className="select-none font-semibold"
                  >
                    {labelSettings.unit}
                  </text>

                  {/* Ruler marks */}
                  <g transform="translate(20, 0)">{generateRulerMarks()}</g>
                </svg>
              )}

              {/* Main Canvas */}
              <div
                ref={canvasRef}
                className="relative bg-white overflow-hidden"
                style={{
                  width: `${canvasWidthPx}px`,
                  height: `${canvasHeightPx}px`,
                  minWidth: "240px",
                  minHeight: "180px",
                }}
                onDragOver={handleCanvasDragOver}
                onDrop={handleCanvasDrop}
                onClick={handleCanvasClick}
              >
                {/* Grid Overlay */}
                {showGrid && (
                  <svg className="absolute inset-0 pointer-events-none" width={canvasWidthPx} height={canvasHeightPx}>
                    {generateGridPattern()}
                  </svg>
                )}

                {/* Elements */}
                {elements.map((el) => (
                  <CanvasElement
                    key={el.id}
                    element={el}
                    isSelected={selectedElement?.id === el.id}
                    onClick={() => setSelectedElement(el)}
                    onUpdate={handleElementUpdate}
                    canvasRef={canvasRef}
                  />
                ))}

                {/* Empty State */}
                {elements.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="relative mb-4">
                        <div className="absolute inset-0 gradient-bg rounded-full blur-lg opacity-20"></div>
                        <Plus className="relative w-16 h-16 mx-auto opacity-60" />
                      </div>
                      <p className="text-lg font-medium">Drag elements here to start designing</p>
                      <p className="text-sm mt-1">Create professional thermal printer labels</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Floating Sidebar - Properties Panel */}
        <aside className="w-72 floating-panel rounded-xl overflow-y-auto panel-font">
          <div className="p-5">
            <h2 className="mb-5 text-base font-bold text-gray-800">Properties</h2>
            {selectedElement ? (
              <PropertiesPanel element={selectedElement} onUpdate={handleElementUpdate} onDelete={deleteElement} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <div className="relative mb-4">
                  <div className="absolute inset-0 gradient-bg rounded-full blur-lg opacity-20"></div>
                  <MousePointerSquare className="relative w-12 h-12 mx-auto opacity-60" />
                </div>
                <p className="text-base text-center font-medium">Select an element</p>
                <p className="text-sm text-center mt-1">Click on any element to edit its properties</p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}

interface CanvasElementProps {
  element: Element
  isSelected: boolean
  onClick: () => void
  onUpdate: (id: number, newProps: Partial<Element>) => void
  canvasRef: React.RefObject<HTMLDivElement>
}

const CanvasElement: FC<CanvasElementProps> = ({ element, isSelected, onClick, onUpdate, canvasRef }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [resizeHandle, setResizeHandle] = useState<string>("")

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({ x: e.clientX - element.x, y: e.clientY - element.y })
    onClick()
  }

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width || 100,
      height: element.height || 20,
    })
    onClick()
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const canvasRect = canvasRef.current?.getBoundingClientRect()
        const canvasWidth = canvasRect?.width || 400
        const canvasHeight = canvasRect?.height || 300
        const elementWidth = element.width || 100
        const elementHeight = element.height || 20

        const newX = Math.max(0, Math.min(canvasWidth - elementWidth, e.clientX - dragStart.x))
        const newY = Math.max(0, Math.min(canvasHeight - elementHeight, e.clientY - dragStart.y))
        onUpdate(element.id, { x: newX, y: newY })
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x
        const deltaY = e.clientY - resizeStart.y

        let newWidth = resizeStart.width
        let newHeight = resizeStart.height
        let newX = element.x
        let newY = element.y

        switch (resizeHandle) {
          case "se": // bottom-right
            newWidth = Math.max(20, resizeStart.width + deltaX)
            newHeight = Math.max(10, resizeStart.height + deltaY)
            break
          case "sw": // bottom-left
            newWidth = Math.max(20, resizeStart.width - deltaX)
            newHeight = Math.max(10, resizeStart.height + deltaY)
            newX = element.x + (resizeStart.width - newWidth)
            break
          case "ne": // top-right
            newWidth = Math.max(20, resizeStart.width + deltaX)
            newHeight = Math.max(10, resizeStart.height - deltaY)
            newY = element.y + (resizeStart.height - newHeight)
            break
          case "nw": // top-left
            newWidth = Math.max(20, resizeStart.width - deltaX)
            newHeight = Math.max(10, resizeStart.height - deltaY)
            newX = element.x + (resizeStart.width - newWidth)
            newY = element.y + (resizeStart.height - newHeight)
            break
          case "e": // right
            newWidth = Math.max(20, resizeStart.width + deltaX)
            break
          case "w": // left
            newWidth = Math.max(20, resizeStart.width - deltaX)
            newX = element.x + (resizeStart.width - newWidth)
            break
          case "s": // bottom
            newHeight = Math.max(10, resizeStart.height + deltaY)
            break
          case "n": // top
            newHeight = Math.max(10, resizeStart.height - deltaY)
            newY = element.y + (resizeStart.height - newHeight)
            break
        }

        onUpdate(element.id, {
          width: newWidth,
          height: newHeight,
          x: Math.max(0, Math.min((canvasRef.current?.getBoundingClientRect()?.width || 400) - newWidth, newX)),
          y: Math.max(0, Math.min((canvasRef.current?.getBoundingClientRect()?.height || 300) - newHeight, newY)),
        })
      }
    },
    [
      isDragging,
      isResizing,
      dragStart,
      resizeStart,
      resizeHandle,
      element.id,
      element.x,
      element.y,
      onUpdate,
      canvasRef,
    ],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle("")
  }, [])

  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  const renderElement = () => {
    const width = element.width || 100
    const height = element.height || 20

    switch (element.type) {
      case "text":
        return (
          <div
            className="select-none whitespace-nowrap overflow-hidden"
            style={{
              fontSize: `${element.fontSize}px`,
              fontFamily: element.fontFamily || "Arial",
              fontWeight: element.fontWeight || "400",
              transform: `rotate(${element.rotation}deg)`,
              transformOrigin: "top left",
              width: `${width}px`,
              height: `${height}px`,
              lineHeight: `${height}px`,
            }}
          >
            {element.content}
          </div>
        )
      case "barcode":
        return (
          <div
            className="flex flex-col items-center select-none"
            style={{ width: `${width}px`, height: `${height + 20}px` }}
          >
            <div
              className="bg-black"
              style={{
                width: `${width}px`,
                height: `${height}px`,
                backgroundImage: "repeating-linear-gradient(90deg, black 0px, black 2px, white 2px, white 4px)",
              }}
            />
            <span className="text-xs mt-1 code-font">{element.data}</span>
          </div>
        )
      case "qr":
        return (
          <div
            className="select-none flex items-center justify-center bg-black text-white"
            style={{ width: `${width}px`, height: `${height}px` }}
          >
            <QrCode className="w-full h-full p-1" />
          </div>
        )
      default:
        return null
    }
  }

  const renderResizeHandles = () => {
    if (!isSelected) return null

    const handleStyle = "absolute w-2 h-2 bg-purple-500 border border-white rounded-sm"
    const width = element.width || 100
    const height = element.height || 20

    return (
      <>
        {/* Corner handles */}
        <div
          className={`${handleStyle} cursor-nw-resize`}
          style={{ top: -4, left: -4 }}
          onMouseDown={(e) => handleResizeMouseDown(e, "nw")}
        />
        <div
          className={`${handleStyle} cursor-ne-resize`}
          style={{ top: -4, right: -4 }}
          onMouseDown={(e) => handleResizeMouseDown(e, "ne")}
        />
        <div
          className={`${handleStyle} cursor-sw-resize`}
          style={{ bottom: -4, left: -4 }}
          onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
        />
        <div
          className={`${handleStyle} cursor-se-resize`}
          style={{ bottom: -4, right: -4 }}
          onMouseDown={(e) => handleResizeMouseDown(e, "se")}
        />

        {/* Edge handles */}
        <div
          className={`${handleStyle} cursor-n-resize`}
          style={{ top: -4, left: `${width / 2 - 4}px` }}
          onMouseDown={(e) => handleResizeMouseDown(e, "n")}
        />
        <div
          className={`${handleStyle} cursor-s-resize`}
          style={{ bottom: -4, left: `${width / 2 - 4}px` }}
          onMouseDown={(e) => handleResizeMouseDown(e, "s")}
        />
        <div
          className={`${handleStyle} cursor-w-resize`}
          style={{ left: -4, top: `${height / 2 - 4}px` }}
          onMouseDown={(e) => handleResizeMouseDown(e, "w")}
        />
        <div
          className={`${handleStyle} cursor-e-resize`}
          style={{ right: -4, top: `${height / 2 - 4}px` }}
          onMouseDown={(e) => handleResizeMouseDown(e, "e")}
        />
      </>
    )
  }

  return (
    <div
      className={cn(
        "absolute cursor-move select-none transition-all duration-200",
        isSelected && "ring-2 ring-purple-400 ring-offset-2",
      )}
      style={{ left: element.x, top: element.y }}
      onMouseDown={handleMouseDown}
    >
      {renderElement()}
      {renderResizeHandles()}
    </div>
  )
}

interface PropertiesPanelProps {
  element: Element
  onUpdate: (id: number, newProps: Partial<Element>) => void
  onDelete: (id: number) => void
}

const PropertiesPanel: FC<PropertiesPanelProps> = ({ element, onUpdate, onDelete }) => {
  const updateProp = (prop: string, value: any) => {
    onUpdate(element.id, { [prop]: value })
  }

  const renderProperties = () => {
    switch (element.type) {
      case "text":
        return (
          <Card className="border-gray-200 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 gradient-bg rounded-md">
                  <Type className="w-4 h-4 text-white" />
                </div>
                Text Properties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="content" className="text-sm font-semibold text-gray-700">
                  Content
                </Label>
                <Input
                  id="content"
                  value={element.content}
                  onChange={(e) => updateProp("content", e.target.value)}
                  className="mt-1 text-sm bg-white/70 border-gray-200 focus:border-purple-300 transition-colors h-8"
                />
              </div>
              <div>
                <Label htmlFor="font-size" className="text-sm font-semibold text-gray-700">
                  Font Size
                </Label>
                <Input
                  id="font-size"
                  type="number"
                  value={element.fontSize}
                  onChange={(e) => updateProp("fontSize", Number.parseInt(e.target.value))}
                  className="mt-1 text-sm bg-white/70 border-gray-200 focus:border-purple-300 transition-colors h-8"
                />
              </div>
              <div>
                <Label htmlFor="font-family" className="text-sm font-semibold text-gray-700">
                  Font Family
                </Label>
                <Select value={element.fontFamily} onValueChange={(val) => updateProp("fontFamily", val)}>
                  <SelectTrigger className="mt-1 text-sm bg-white/70 border-gray-200 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Courier New">Courier New</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="font-weight" className="text-sm font-semibold text-gray-700">
                  Font Weight
                </Label>
                <Select value={element.fontWeight || "400"} onValueChange={(val) => updateProp("fontWeight", val)}>
                  <SelectTrigger className="mt-1 text-sm bg-white/70 border-gray-200 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">Thin (100)</SelectItem>
                    <SelectItem value="200">Extra Light (200)</SelectItem>
                    <SelectItem value="300">Light (300)</SelectItem>
                    <SelectItem value="400">Regular (400)</SelectItem>
                    <SelectItem value="500">Medium (500)</SelectItem>
                    <SelectItem value="600">Semi Bold (600)</SelectItem>
                    <SelectItem value="700">Bold (700)</SelectItem>
                    <SelectItem value="800">Extra Bold (800)</SelectItem>
                    <SelectItem value="900">Black (900)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rotation" className="text-sm font-semibold text-gray-700">
                  Rotation
                </Label>
                <Select
                  value={String(element.rotation)}
                  onValueChange={(val) => updateProp("rotation", Number.parseInt(val))}
                >
                  <SelectTrigger className="mt-1 text-sm bg-white/70 border-gray-200 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0°</SelectItem>
                    <SelectItem value="90">90°</SelectItem>
                    <SelectItem value="180">180°</SelectItem>
                    <SelectItem value="270">270°</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )
      case "barcode":
        return (
          <Card className="border-gray-200 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 gradient-bg rounded-md">
                  <Barcode className="w-4 h-4 text-white" />
                </div>
                Barcode Properties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="data" className="text-sm font-semibold text-gray-700">
                  Data
                </Label>
                <Input
                  id="data"
                  value={element.data}
                  onChange={(e) => updateProp("data", e.target.value)}
                  className="mt-1 text-sm bg-white/70 border-gray-200 focus:border-purple-300 transition-colors code-font h-8"
                />
              </div>
              <div>
                <Label htmlFor="barcode-type" className="text-sm font-semibold text-gray-700">
                  Barcode Type
                </Label>
                <Select value={element.barcodeType} onValueChange={(val) => updateProp("barcodeType", val)}>
                  <SelectTrigger className="mt-1 text-sm bg-white/70 border-gray-200 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Code 128">Code 128</SelectItem>
                    <SelectItem value="EAN-13">EAN-13</SelectItem>
                    <SelectItem value="UPC-A">UPC-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )
      case "qr":
        return (
          <Card className="border-gray-200 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 gradient-bg rounded-md">
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                QR Code Properties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="data" className="text-sm font-semibold text-gray-700">
                  Data
                </Label>
                <Textarea
                  id="data"
                  value={element.data}
                  onChange={(e) => updateProp("data", e.target.value)}
                  className="mt-1 text-sm bg-white/70 border-gray-200 focus:border-purple-300 transition-colors code-font resize-none h-16"
                />
              </div>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-5">
      {renderProperties()}
      <Card className="border-gray-200 bg-white/70 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-1.5 gradient-bg rounded-md">
              <FileText className="w-4 h-4 text-white" />
            </div>
            Position & Size
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label htmlFor="pos-x" className="text-sm font-semibold text-gray-700">
                X Position
              </Label>
              <Input
                id="pos-x"
                type="number"
                value={Math.round(element.x)}
                onChange={(e) => updateProp("x", Number.parseInt(e.target.value) || 0)}
                className="mt-1 text-sm bg-white/70 border-gray-200 focus:border-purple-300 transition-colors h-8"
              />
            </div>
            <div>
              <Label htmlFor="pos-y" className="text-sm font-semibold text-gray-700">
                Y Position
              </Label>
              <Input
                id="pos-y"
                type="number"
                value={Math.round(element.y)}
                onChange={(e) => updateProp("y", Number.parseInt(e.target.value) || 0)}
                className="mt-1 text-sm bg-white/70 border-gray-200 focus:border-purple-300 transition-colors h-8"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label htmlFor="width" className="text-sm font-semibold text-gray-700">
                Width
              </Label>
              <Input
                id="width"
                type="number"
                value={element.width || 100}
                onChange={(e) => updateProp("width", Number.parseInt(e.target.value) || 100)}
                className="mt-1 text-sm bg-white/70 border-gray-200 focus:border-purple-300 transition-colors h-8"
              />
            </div>
            <div>
              <Label htmlFor="height" className="text-sm font-semibold text-gray-700">
                Height
              </Label>
              <Input
                id="height"
                type="number"
                value={element.height || 20}
                onChange={(e) => updateProp("height", Number.parseInt(e.target.value) || 20)}
                className="mt-1 text-sm bg-white/70 border-gray-200 focus:border-purple-300 transition-colors h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Button
        variant="destructive"
        className="w-full bg-red-500 hover:bg-red-600 text-white transition-colors text-sm h-8"
        onClick={() => onDelete(element.id)}
      >
        <Trash2 className="w-4 h-4 mr-1.5" />
        Delete Element
      </Button>
    </div>
  )
}

interface LoadDesignDialogProps {
  onLoadDesign: (code: string) => void
}

const LoadDesignDialog: FC<LoadDesignDialogProps> = ({ onLoadDesign }) => {
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLoad = async () => {
    if (!code.trim()) {
      alert("Please enter some code to import.")
      return
    }

    setIsLoading(true)
    try {
      onLoadDesign(code)
      setCode("")
    } catch (error) {
      console.error("Error loading design:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 py-4">
      <div>
        <Label htmlFor="import-code" className="text-sm font-semibold text-gray-700">
          Paste ZPL Code
        </Label>
        <Textarea
          id="import-code"
          placeholder="Paste your ZPL code here..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 h-64 code-font text-xs bg-gray-900 text-green-400 border-gray-700 placeholder:text-green-600/50 resize-none"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setCode("")} className="border-gray-200 text-sm h-8 px-3">
          Clear
        </Button>
        <Button
          onClick={handleLoad}
          disabled={isLoading || !code.trim()}
          className="gradient-bg text-white hover:opacity-90 transition-opacity text-sm h-8 px-3"
        >
          <Download className="w-4 h-4 mr-2" />
          {isLoading ? "Loading..." : "Load Design"}
        </Button>
      </div>
    </div>
  )
}
