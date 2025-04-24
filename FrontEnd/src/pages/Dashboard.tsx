import { BulkGiftTable } from "../ui/BulkGiftTable";
import { CardBox } from "../ui/CardBox";
import Container from "../ui/Container";
import ProfileHeader from "../ui/ProfileHeader";
import { GiftCard } from "../ui/GiftCard"; // already imported

// Sample data for BulkGiftTable
const sampleData = [
  {
    code: "GIFT123",
    status: "Active",
    amount: 100,
    token: "USD",
    expiry: "2025-12-31",
    claimed: false,
  },
  {
    code: "GIFT124",
    status: "Expired",
    amount: 50,
    token: "USDC",
    expiry: "2023-12-31",
    claimed: true,
  },
];

const userCards = [
  {
    cardName: "Card 1",
    status: "Claimed",
    amount: 100,
    token: "USDT",
    expiry: "2025-12-01",
    giftCode: "2e43-rf65-fder-fr3s"
  },
  {
    cardName: "Card 2",
    status: "Pending",
    amount: 50,
    token: "USDC",
    expiry: "2025-07-30",
    giftCode: "2e43-rf65-fder-fr3s"

  },
  {
    cardName: "Card 3",
    status: "Expired",
    amount: 25,
    token: "DAI",
    expiry: "2023-10-10",
    giftCode: "2e43-rf65-fder-fr3s"

  },
];

export default function Dashboard() {
    return (
      <div className="min-h-screen relative bg-figmablue overflow-hidden">
        {/* Gradient Blurs - now higher z-index */}
        <div className="absolute top-0 left-0 w-64 h-64 inset-9 bg-[#9812C2] blur-[120px] opacity-100 z-0" />
        <div className="absolute bottom-32 right-0 w-64 inset-9 h-64 bg-[#9812C2] blur-[120px] opacity-100 z-0" />
        <div className="absolute bottom-0 left-1/3 w-48 inset-9 h-48 bg-[#9812C2] blur-[120px] opacity-100 z-0" />
  
        <Container className="relative z-10"> {/* Brought content above gradients */}
          <div className="flex justify-between items-start">
            <ProfileHeader />
          </div>
  
          <div className="flex gap-4 mt-6">
            <CardBox title="Total Gift" value="$0.00" />
            <CardBox title="Claimed Gift" value="0%" />
            <CardBox title="Fee Paid" value="0" />
          </div>
  
          <BulkGiftTable data={sampleData} />
  
          {/* GiftCard section */}
          <div className="mt-10">
            <h2 className="text-white font-semibold mb-4">Your Gift Cards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {userCards.map((card, idx) => (
                <div key={idx} className="relative">
                  {idx === userCards.length - 1 && (
                    <div className="absolute inset-0 bg-[#9812C2] blur-[120px] opacity-100 z-0 rounded-xl" />
                  )}
                  <GiftCard card={card} />
                </div>
              ))}
            </div>
          </div>
        </Container>
      </div>
    );
  }
  