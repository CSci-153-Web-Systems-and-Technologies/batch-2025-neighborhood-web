"use client";

interface StoreCardProps {
  name: string
  rating: number
  address: string
  image?: string
  onClick?: () => void;
}

export default function StoreCard({ name, rating, address, image, onClick }: StoreCardProps) {
  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative h-48 w-full rounded-2xl overflow-hidden mb-3 bg-gray-100 shadow-sm group-hover:shadow-md transition-all">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
             Store Image
          </div>
        )}
      </div>
      
      {/* Card Info */}
      <div className="space-y-1">
        <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-[#88A2FF] transition-colors">
          {name}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
           <div className="flex items-center text-gray-900 font-bold">
             <span className="text-yellow-400 mr-1">★</span>
             {typeof rating === 'number' ? rating.toFixed(2) : "0.00"}
           </div>
           <span className="text-gray-300">|</span>
           <p className="truncate text-gray-500">{address}</p>
        </div>
      </div>
    </div>
  )
}