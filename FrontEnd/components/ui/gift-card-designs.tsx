import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface GiftCardDesignProps {
  designs: string[]
  selectedDesign: number
  onSelect: (index: number) => void
  className?: string
}

export function GiftCardDesigns({ designs, selectedDesign, onSelect, className }: GiftCardDesignProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {designs.map((design, index) => (
        <motion.div
          key={index}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "border-2 rounded-md p-1 cursor-pointer transition-all",
            selectedDesign === index ? "border-primary glow-border" : "border-muted hover:border-primary/50"
          )}
          onClick={() => onSelect(index)}
        >
          <div className="relative overflow-hidden rounded">
            <div className="absolute inset-0 gift-card-bg gift-card-pattern"></div>
            <img
              src={design}
              alt={`Card design ${index + 1}`}
              className="w-full h-auto relative z-10 opacity-80"
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
} 