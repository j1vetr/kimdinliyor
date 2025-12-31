import { motion, AnimatePresence } from "framer-motion";

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  staggerDelay?: number;
  animationDuration?: number;
  direction?: "up" | "down" | "left" | "right";
}

export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className = "",
  staggerDelay = 0.1,
  animationDuration = 0.4,
  direction = "up",
}: AnimatedListProps<T>) {
  const getInitialPosition = () => {
    switch (direction) {
      case "up": return { y: 20, x: 0 };
      case "down": return { y: -20, x: 0 };
      case "left": return { x: 20, y: 0 };
      case "right": return { x: -20, y: 0 };
    }
  };

  const initial = getInitialPosition();

  return (
    <div className={className}>
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item, index)}
            initial={{ opacity: 0, ...initial, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, ...initial }}
            transition={{
              duration: animationDuration,
              delay: index * staggerDelay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            layout
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default AnimatedList;
