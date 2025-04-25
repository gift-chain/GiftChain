import React from 'react'

const ValidateGift = () => {
  return (
    <div>ValidateGift</div>
  )
}

export default ValidateGift



// import React, { useState } from 'react';
// import { ethers } from 'ethers';
// import axios from 'axios';
// import { useWeb3React } from '@web3-react/core';
// import { InjectedConnector } from '@web3-react/injected-connector';

// // Enum to match contract status
// enum GiftStatus {
//   NONE = 0,
//   PENDING = 1,
//   SUCCESSFUL = 2,
//   RECLAIMED = 3
// }

// // Error types from contract
// interface GiftErrors {
//   GiftNotFound: string;
//   GiftAlreadyRedeemed: string;
//   GiftAlreadyReclaimed: string;
//   InvalidGiftStatus: string;
// }

// interface ValidationErrors {
//   code?: string;
// }

// interface GiftDetails {
//   isValid: boolean;
//   status?: GiftStatus;
//   token?: string;
//   amount?: string;
//   message?: string;
//   expiry?: number;
//   timeCreated?: number;
//   errorMessage?: string;
// }

// const injected = new InjectedConnector({
//   supportedChainIds: [1, 3, 4, 5, 42] // Add your supported chain IDs
// });

// const CryptoGiftValidation: React.FC = () => {
//   const { activate, account, active } = useWeb3React();
//   const [code, setCode] = useState<string>('');
//   const [errors, setErrors] = useState<ValidationErrors>({});
//   const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
//   const [giftDetails, setGiftDetails] = useState<GiftDetails | null>(null);
//   const [loading, setLoading] = useState<boolean>(false);

//   const validateGift = async (rawCode: string): Promise<GiftDetails> => {
//     try {
//       const response = await axios.post('/api/gifts/validate', {
//         code: rawCode,
//         walletAddress: account
//       });
//       return response.data;
//     } catch (error: any) {
//       if (error.response) {
//         return {
//           isValid: false,
//           errorMessage: error.response.data.error
//         };
//       }
//       throw error;
//     }
//   };

//   const getErrorMessage = (errorCode: string): string => {
//     const errorMap: Record<string, string> = {
//       'GiftNotFound': 'Gift card not found. Please check your code.',
//       'GiftAlreadyRedeemed': 'This gift card has already been redeemed.',
//       'GiftAlreadyReclaimed': 'This gift card has been reclaimed by the sender.',
//       'InvalidGiftStatus': 'This gift card is expired or has an invalid status.'
//     };
    
//     return errorMap[errorCode] || 'An unknown error occurred.';
//   };

//   const formatDate = (timestamp: number): string => {
//     return new Date(timestamp * 1000).toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   const getStatusColor = (status?: GiftStatus): string => {
//     switch (status) {
//       case GiftStatus.PENDING:
//         return 'bg-blue-500';
//       case GiftStatus.SUCCESSFUL:
//         return 'bg-green-500';
//       case GiftStatus.RECLAIMED:
//         return 'bg-purple-500';
//       default:
//         return 'bg-gray-500';
//     }
//   };

//   const getStatusText = (status?: GiftStatus): string => {
//     switch (status) {
//       case GiftStatus.PENDING:
//         return 'Pending';
//       case GiftStatus.SUCCESSFUL:
//         return 'Redeemed';
//       case GiftStatus.RECLAIMED:
//         return 'Reclaimed';
//       default:
//         return 'Unknown';
//     }
//   };

//   const handleCodeValidation = async () => {
//     if (!code.trim() || code.length < 6) {
//       setErrors({...errors, code: 'Gift card code is required and must be at least 6 characters'});
//       return;
//     }

//     try {
//       setLoading(true);
//       const result = await validateGift(code);
//       setLoading(false);
//       setGiftDetails(result);
      
//       if (!result.isValid) {
//         setErrors({
//           ...errors,
//           code: getErrorMessage(result.errorMessage!)
//         });
//       } else {
//         setErrors({...errors, code: undefined});
//       }
//     } catch (error) {
//       setLoading(false);
//       console.error('Error validating code:', error);
//       setErrors({
//         ...errors,
//         code: 'Error validating code on blockchain'
//       });
//     }
//   };

//   const handleConnectWallet = async () => {
//     try {
//       setIsSubmitting(true);
//       await activate(injected);
//       setIsSubmitting(false);
//     } catch (error) {
//       setIsSubmitting(false);
//       console.error('Error connecting wallet:', error);
//       alert('Failed to connect wallet. Please try again.');
//     }
//   };

//   const handleClaimGift = async () => {
//     if (!active) {
//       alert('Please connect your wallet first');
//       return;
//     }

//     if (!giftDetails?.isValid) {
//       alert('Please validate a valid gift code first');
//       return;
//     }

//     try {
//       setIsSubmitting(true);
      
//       const response = await axios.post('/api/gifts/claim', {
//         code,
//         walletAddress: account
//       });
      
//       if (response.data.success) {
//         setGiftDetails({
//           ...giftDetails,
//           status: GiftStatus.SUCCESSFUL,
//           isValid: false
//         });
//       }
      
//       setIsSubmitting(false);
//     } catch (error: any) {
//       setIsSubmitting(false);
//       console.error('Error claiming gift:', error);
//       setErrors({
//         ...errors,
//         code: error.response?.data?.error || 'Transaction failed. Please try again.'
//       });
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-purple-900 flex items-center justify-center p-4">
//       <div className="bg-indigo-950 rounded-lg shadow-xl p-8 w-full max-w-md">
//         <h1 className="text-2xl font-bold text-white text-center mb-6">Gift Card Validator</h1>
//         <p className="text-indigo-200 text-center mb-8">Enter your code to validate and claim your crypto gift</p>
        
//         <div className="mb-6">
//           <label className="block text-indigo-200 mb-2">Gift Card Code</label>
//           <div className="flex">
//             <input
//               type="text"
//               value={code}
//               onChange={(e) => {
//                 setCode(e.target.value);
//                 setGiftDetails(null);
//               }}
//               className="w-full bg-indigo-900/50 text-white rounded-l-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
//               placeholder="Enter gift code"
//             />
//             <button 
//               type="button"
//               onClick={handleCodeValidation}
//               disabled={loading || !code.trim() || code.length < 6}
//               className="bg-indigo-700 hover:bg-indigo-600 text-white px-4 rounded-r-lg focus:outline-none disabled:opacity-50"
//             >
//               {loading ? 
//                 <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                 </svg> 
//                 : 'Validate'
//               }
//             </button>
//           </div>
//           {errors.code && <p className="text-red-400 mt-1 text-sm">{errors.code}</p>}
//         </div>
        
//         {/* Gift Card Display */}
//         {giftDetails && (
//           <div className="mb-6 bg-indigo-900/30 rounded-xl overflow-hidden border border-indigo-800/50">
//             <div className={`p-4 ${getStatusColor(giftDetails.status)} text-white flex justify-between items-center`}>
//               <h3 className="font-bold">Gift Card Status</h3>
//               <span className="px-2 py-1 text-xs rounded-full bg-white/20">
//                 {getStatusText(giftDetails.status)}
//               </span>
//             </div>
            
//             <div className="p-4">
//               {giftDetails.message && (
//                 <div className="mb-4">
//                   <h4 className="text-indigo-200 text-sm mb-1">Message</h4>
//                   <p className="text-white font-medium">{giftDetails.message}</p>
//                 </div>
//               )}
              
//               <div className="grid grid-cols-2 gap-4 mb-4">
//                 {giftDetails.amount && (
//                   <div>
//                     <h4 className="text-indigo-200 text-sm mb-1">Amount</h4>
//                     <p className="text-white font-medium">{giftDetails.amount} USDC</p>
//                   </div>
//                 )}
                
//                 {giftDetails.token && (
//                   <div>
//                     <h4 className="text-indigo-200 text-sm mb-1">Token</h4>
//                     <p className="text-white font-medium truncate" title={giftDetails.token}>
//                       {giftDetails.token.slice(0, 6)}...{giftDetails.token.slice(-4)}
//                     </p>
//                   </div>
//                 )}
//               </div>
              
//               {giftDetails.timeCreated && (
//                 <div className="mb-4">
//                   <h4 className="text-indigo-200 text-sm mb-1">Created</h4>
//                   <p className="text-white text-sm">{formatDate(giftDetails.timeCreated)}</p>
//                 </div>
//               )}
              
//               {giftDetails.expiry && (
//                 <div className="mb-4">
//                   <h4 className="text-indigo-200 text-sm mb-1">
//                     {giftDetails.expiry * 1000 > Date.now() ? 'Expires' : 'Expired'}
//                   </h4>
//                   <p className={`text-sm ${
//                     giftDetails.expiry * 1000 > Date.now() ? 'text-white' : 'text-red-400'
//                   }`}>
//                     {formatDate(giftDetails.expiry)}
//                   </p>
//                 </div>
//               )}
              
//               {giftDetails.isValid ? (
//                 <button
//                   onClick={handleClaimGift}
//                   disabled={isSubmitting || !active}
//                   className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {isSubmitting ? 'Claiming...' : 'Claim Gift'}
//                 </button>
//               ) : (
//                 <div className="text-center py-2">
//                   <p className="text-red-400 text-sm">
//                     {giftDetails.errorMessage ? getErrorMessage(giftDetails.errorMessage) : 'This gift cannot be claimed'}
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
        
//         <button
//           type="button"
//           onClick={handleConnectWallet}
//           disabled={isSubmitting || active}
//           className={`w-full py-3 px-4 rounded-lg text-white font-medium mb-4 ${
//             active 
//               ? 'bg-green-500 hover:bg-green-600' 
//               : 'bg-purple-500 hover:bg-purple-600'
//           } transition-colors`}
//         >
//           {isSubmitting && !active ? 'Connecting...' : active ? 'Wallet Connected ✓' : 'Connect Wallet'}
//         </button>
        
//         {active && (
//           <div className="mb-6 p-3 bg-indigo-800/30 rounded-lg">
//             <p className="text-green-400 text-sm flex items-center">
//               <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
//                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//               </svg>
//               Wallet connected
//             </p>
//             <p className="text-indigo-200 text-xs mt-1 truncate" title={account}>
//               Address: {account}
//             </p>
//           </div>
//         )}
        
//         <div className="mt-6 text-xs text-indigo-300">
//           <p className="mb-1">Test codes:</p>
//           <ul className="list-disc pl-5 space-y-1">
//             <li><code className="bg-indigo-900/50 px-1 rounded">VALID123</code> - Valid gift card</li>
//             <li><code className="bg-indigo-900/50 px-1 rounded">REDEEMED123</code> - Already redeemed</li>
//             <li><code className="bg-indigo-900/50 px-1 rounded">RECLAIMED123</code> - Already reclaimed</li>
//             <li><code className="bg-indigo-900/50 px-1 rounded">NOTFOUND123</code> - Gift not found</li>
//             <li><code className="bg-indigo-900/50 px-1 rounded">EXPIRED123</code> - Expired gift</li>
//           </ul>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CryptoGiftValidation;