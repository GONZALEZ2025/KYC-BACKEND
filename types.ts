export type CreateTxPayload = {
  fullName: string;
  dob?: string;
  address?: string;
  phone?: string;
  email?: string;
  idType?: string;
  idNumber?: string;
  idExpiry?: string;
  asset: string;
  usdAmount: number;
  feePct: number;
  wallet: string;
  txHash?: string;
  pricing: {
    priceUsd: number;
    pricedAtISO: string;
    amountCrypto: number;
  };
};

export type TxRecord = CreateTxPayload & {
  id: string;
  status: "created" | "signed" | "sent";
  sanctions?: { provider?: string; referenceId?: string; result?: string };
  files: { idImage?: string; selfie?: string; pdf?: string; signature?: string };
  createdAt: string;
  updatedAt: string;
  token: string;
};
