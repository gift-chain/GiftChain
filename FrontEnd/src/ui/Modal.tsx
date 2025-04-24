import m1 from '/images/m1.svg';
import m2 from '/images/m2.svg';
import { IoClose } from 'react-icons/io5';
import { useConnect } from 'wagmi';

const Modal = ({ handleModal }: { handleModal: () => void }) => {
    const { connectors, connect } = useConnect();

    // Prevent clicks inside the modal from closing it
    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div 
            className="fixed inset-0 flex items-center justify-center bg-black/60 z-50" 
            onClick={handleModal}
        >
            <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#1F1668] w-[90%] lg:w-[50%] py-8 px-4 lg:px-8 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-300"
                onClick={stopPropagation}
            >
                <span className="absolute top-4 right-4 cursor-pointer z-[999]">
                    <IoClose 
                        onClick={handleModal} 
                        className="text-3xl text-white hover:text-[#9812C2] transition-colors duration-200" 
                    />
                </span>
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="w-full lg:w-[40%] border-r-0 lg:border-r-2 border-gray-500 px-4 lg:pr-8 flex flex-col items-center">
                        <h2 className="text-2xl font-bold text-white mb-4">Connect a Wallet</h2>
                        <h6 className="text-sm text-[#9812C2] font-semibold mb-6">Installed</h6>

                        <div className="flex flex-col gap-4 mb-8 w-full">
                            {connectors.map((connector) => (
                                <button
                                    key={connector.id}
                                    onClick={() => {
                                        connect({ connector });
                                        handleModal();
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 bg-[#2A1F7A] hover:bg-[#3B2A9B] text-white font-semibold rounded-lg transition-colors duration-200"
                                >
                                    <img src={connector.icon} className="w-6 h-6" alt="" />
                                    {connector.name}
                                </button>
                            ))}
                            <button
                                onClick={handleModal}
                                className="mt-4 px-4 py-3 bg-[#781515] hover:bg-[#9B1C1C] text-white font-bold rounded-lg transition-colors duration-200"
                            >
                                Cancel Connect
                            </button>
                        </div>
                    </div>
                    <div className="w-full lg:w-[60%] px-4 lg:px-8 flex flex-col items-center justify-center gap-8 hidden lg:flex">
                        <div className="flex flex-col items-center">
                            <h2 className="text-2xl font-bold text-white mb-6">What is a Wallet?</h2>
                            <div className="flex items-center gap-4 mb-6">
                                <img src={m1} className="w-10 h-10" alt="" />
                                <div>
                                    <h4 className="text-lg font-semibold text-white">A Home for Your Digital Assets</h4>
                                    <p className="text-gray-300 text-sm">Wallets are used to send, receive, store, and display digital assets like Ethereum and NFTs.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <img src={m2} className="w-10 h-10" alt="" />
                                <div>
                                    <h4 className="text-lg font-semibold text-white">A New Way to Log In</h4>
                                    <p className="text-gray-300 text-sm">Instead of creating new accounts and passwords on every website, just connect your wallet.</p>
                                </div>
                            </div>
                        </div>
                        <button className="bg-[#9812C2] hover:bg-[#B315E6] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200">
                            Get a Wallet
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;