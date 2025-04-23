import { Link } from "react-router-dom"
import { twMerge } from "tailwind-merge"

const Button = ({ title, icon, Icon, className, onclick, path }: any) => {
    const newClassName = twMerge("flex whitespace-nowrap gap-1 text-sm items-center capitalize border-0  rounded-lg  shadow-2xl py-3 px-5", className)
    return (
        <Link to={path} className={newClassName} onClick={onclick}>
            {icon && icon} {title}

        </Link>
    )
}

export default Button
