import { twMerge } from "tailwind-merge";


const Container = ({ children, className }: { children: React.ReactNode, className: string }) => {
    const newClassName = twMerge(
        "max-w-screen-xl mx-auto py-10 lg:py-20 px-2 lg:px-0",
        className
    );
    return <div className={newClassName}>{children}</div>;
};

export default Container;