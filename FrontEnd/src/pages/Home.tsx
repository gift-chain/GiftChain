import Button from "../ui/Button"
import Container from "../ui/Container"
import Marquee from "react-fast-marquee";
import giftcard from "/images/giftcard.png"
import dai from "/images/dai.svg"
import usdt from "/images/usdt.svg"
import lisk from "/images/lisk.svg"
import usdc from "/images/usdc.svg"
import chain from "/images/chain.svg"
import btc from "/images/btc.svg"
import check from "/images/check.svg"
import mark from "/images/mark.svg"
import spring from "/images/spring.svg"
import { useState } from "react";
import { BiChevronDown } from "react-icons/bi";

const Home = () => {

    const [openIndex, setOpenIndex] = useState<any | null>(null);

    const toggle = ({ index }: any) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const faqs = [
        { question: "What if I lose my redeem code?", answer: "You may not be able to recover it. Please keep it safe." },
        { question: "Is GiftChain custodial?", answer: "No, it's non-custodial. You control your assets." },
        { question: "What tokens are supported?", answer: "We support ETH, USDC, DAI, and more." },
    ];

    const imgIcon = [{ title: "Dai", icon: dai }, { title: "Usdt", icon: usdt }, { title: "Lisk", icon: lisk }, { title: "Usdc", icon: usdc }, { title: "ChainLink", icon: chain }, { title: "Btc", icon: btc }];

    const chainList = [
        { icon: mark, title: "Select crypto type, gift amount, and recipient (email or wallet address)." },
        { icon: mark, title: "A unique redeemable code is created, which can be used by the recipient." },
        { icon: mark, title: "Options for gift expiration and secure, blockchain-based transactions." },
        { icon: mark, title: "The sender confirms, and the recipient redeems the code or receives crypto." },
    ];


    return (
        <div className="bg-[#1F1668]">

            <Container className="">
                <div className="flex justify-center items-center gap-5">
                    <div className="">
                        <h2 className="text-3xl font-bold text-white">Give the Gift of Crypto without the <br /> Complexity  No Wallet Address Needed.</h2>
                        <p className="text-white">GiftChain lets you send crypto as easily as a message  simple, secure, and personal.</p>
                        <div className="flex mt-10 gap-3">
                            <Button title="Create Gift  Card" className="bg-[#9812C2] text-white" />
                            <Button title="Claim Gift Card" className="border-[#9812C2] text-white border-2 " path="/about" />
                        </div>
                    </div>
                    <div className="">
                        <img src={giftcard} alt="" />
                    </div>
                </div>
            </Container>
            <div className="bg-[#130A59]">
                <Container className="py-1 lg:py-3 ">
                    {/* <Marquee> */}
                    <div className="flex justify-between items-center">
                        {imgIcon.map((item, index) => (
                            <img src={item.icon} alt={item.title} key={index} className="w-[6%] " />
                        ))}
                    </div>
                    {/* </Marquee> */}
                </Container>
            </div>
            <Container className="">
                <h2 className="text-2xl mb-10 text-white font-bold text-center">Why GiftChain</h2>
                <div className="flex gap-10">

                    <div className="w-full p-[2px] rounded-3xl bg-gradient-to-r from-[#FFFFFF33] via-[#ff5911] to-[#ff4d00]">
                        <div className="flex flex-col bg-white rounded-3xl p-4">
                            <img src={check} alt="" className="w-5 mb-2" />
                            <p className="text-[14px]">The easiest way to send crypto as a gift</p>
                        </div>
                    </div>

                    <div className="w-full p-[2px] rounded-3xl bg-gradient-to-r from-[#FFFFFF33] via-[#ff5911] to-[#ff4d00]">
                        <div className="flex flex-col bg-white rounded-3xl p-4">
                            <img src={check} alt="" className="w-5 mb-2" />
                            <p className="text-[14px]">Give crypto with meaning , no wallet address needed</p>
                        </div>
                    </div>

                    <div className="w-full p-[2px] rounded-3xl bg-gradient-to-r from-[#FFFFFF33] via-[#ff5911] to-[#ff4d00]">
                        <div className="flex flex-col bg-white/75 rounded-3xl p-4">
                            <img src={check} alt="" className="w-5 mb-2" />
                            <p className="text-[14px]">To make sending crypto feel as easy</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center mt-24">
                    <div>
                        <h2 className="text-2xl font-semibold text-white mb-10">How GiftChain Works</h2>
                        <div className="flex flex-col">
                            {chainList.map((item, index) => (
                                <div className="flex items-center gap-6 mb-1" key={index}>
                                    <img src={item.icon} alt="" />
                                    <p className="text-white">{item.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-center">
                        <img src={spring} alt="" />
                    </div>
                </div>

                {/* FAQ */}
                {/* <div className="flex flex-col">
                    <h2>FAQ</h2>
                </div> */}
                <div className="max-w-xl mx-auto p-4 text-white">
                    <h2 className="text-lg font-semibold mb-4">FAQ</h2>
                    <div className="space-y-3">
                        {faqs.map((item, index) => (
                            <div
                                key={index}
                                className="bg-[#0F0C56] rounded-full cursor-pointer px-6 py-4 transition duration-300"
                                onClick={() => toggle(index)}
                            >
                                <div className="flex justify-between items-center">
                                    <span>{item.question}</span>
                                    <BiChevronDown
                                        className={`w-5 h-5 transition-transform duration-300 ${openIndex === index ? "rotate-180" : ""
                                            }`}
                                    />
                                </div>
                                {openIndex === index && (
                                    <p className="mt-3 text-sm text-white">{item.answer}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </Container>
        </div>
    )
}

export default Home
