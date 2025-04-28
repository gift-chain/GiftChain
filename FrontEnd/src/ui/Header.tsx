import { Link } from "react-router-dom"
import Container from "./Container"
import Button from "./Button"
import { useState } from "react"
import Modal from "./Modal"
import { useAccount, useDisconnect } from 'wagmi'

const Header = () => {
    const [modal, setModal] = useState(false)

    const { disconnect } = useDisconnect()
    const { address, isConnected } = useAccount()

    const handleModal = () => {
        setModal((prev) => !prev)
    }

    return (
        <div className="text-white -mb-[80px]">
            <Container className="flex justify-between items-center py-2 lg:py-5">
                <Link to="/" className="text-2xl font-bold">GiftChain</Link>
                {isConnected ? (
                    <Button 
                        title={`Disconnect Wallet ${address?.slice(0, 6)}...${address?.slice(-4)}`} 
                        className="border-[#9812C2] text-white border-2 " 
                        onclick={disconnect} 
                    />
                ) : (
                    <Button 
                        title="Connect Wallet" 
                        className="border-[#9812C2] text-white border-2 " 
                        onclick={() => setModal(true)} 
                    />
                )}
            </Container>
            {modal && <Modal handleModal={handleModal} />}
        </div>
    )
}

export default Header