import { motion } from 'framer-motion'

const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={`bg-muted/50 rounded ${shimmer} ${className || ''}`} />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div>
        <SkeletonBox className="h-9 w-40 mb-2" />
        <SkeletonBox className="h-5 w-56" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="bg-card border rounded-lg p-6 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <SkeletonBox className="h-4 w-24" />
                  <SkeletonBox className="h-8 w-16" />
                  <SkeletonBox className="h-4 w-20" />
                </div>
                <SkeletonBox className="h-12 w-12 rounded-xl" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-card border rounded-lg">
            <div className="p-6 border-b">
              <SkeletonBox className="h-6 w-32" />
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <SkeletonBox className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBox className="h-4 w-32" />
                    <SkeletonBox className="h-3 w-20" />
                  </div>
                  <div className="text-right space-y-2">
                    <SkeletonBox className="h-4 w-20 ml-auto" />
                    <SkeletonBox className="h-3 w-24 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent Tasks Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-card border rounded-lg">
            <div className="p-6 border-b">
              <SkeletonBox className="h-6 w-40" />
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <SkeletonBox className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBox className="h-4 w-40" />
                    <SkeletonBox className="h-3 w-24" />
                  </div>
                  <SkeletonBox className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

