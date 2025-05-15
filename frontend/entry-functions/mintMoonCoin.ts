import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export const mintMoonCoin = (): InputTransactionData => {
  return {
    data: {
      function: `${MODULE_ADDRESS}::message_board::mint_one_mooncoin_to_sender`,
      functionArguments: [],
    },
  };
}; 