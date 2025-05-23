import { MODULE_ADDRESS } from "@/constants";
import { aptosClient } from "@/utils/aptosClient";

export type AccountAPTBalanceArguments = {
  accountAddress: string;
};

export const getAccountAPTBalance = async (args: AccountAPTBalanceArguments): Promise<number> => {
  const { accountAddress } = args;
  const balance = await aptosClient().view<[number]>({
    payload: {
      function: "0x1::coin::balance",
      typeArguments: ["0x1::aptos_coin::AptosCoin"],
      functionArguments: [accountAddress],
    },
  });
  return balance[0];
};

export type AccountBBTBalanceArguments = {
  accountAddress: string;
};

export const getAccountBBTBalance = async (args: AccountBBTBalanceArguments): Promise<number> => {
  const { accountAddress } = args;
  const balance = await aptosClient().view<[number]>({
    payload: {
      function: `${MODULE_ADDRESS}::message_board::get_bbt_balance`,
      functionArguments: [accountAddress],
    },
  });
  return balance[0] / Math.pow(10, 8); // Convert from raw amount to BBT (8 decimals)
};
