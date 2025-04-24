// src/components/CardBox.tsx
type CardBoxProps = {
    title: string;
    value: string;
  };
  
  export const CardBox = ({ title, value }: CardBoxProps) => {
    return (
      <div className="flex-1 bg-black/10 p-4 rounded-xl text-white">
        <p className="text-sm">{title}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </div>
    );
  };
  