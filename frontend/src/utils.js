export const ROLES = {
	ADMIN_ROLE: 0n,
	MINTER: 1n,
    PREDICTER: 2n,
    QUESTION_MANAGER: 3n,
    FUNDS_MANAGER: 4n,
};

export async function changeToNetwork(networkId){
    if (window.ethereum.networkVersion !== networkId) {
        try {
			// const networkIdHex = `0x${networkId.toString(16)}`;
			const networkIdHex = networkId;
			await window.ethereum.request({
				method: "wallet_switchEthereumChain",
				params: [{chainId: networkIdHex}]
			});
		} catch (error) {
			let msg = "";
			if (error.code === 4902) {
				msg = `Network ${chainId} not found, please add it to your wallet. Or switch to it manually.`
			} else if (error.code === 4001) {
				msg = "User rejected request."
			} else {
				msg = "Error switching network.";
			}

			console.error(msg, error);
			// setWalletError(msg);
		}
    }
}