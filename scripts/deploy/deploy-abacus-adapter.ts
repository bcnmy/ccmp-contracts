import { ethers } from "hardhat";
import { AbacusAdapter__factory } from "../../typechain-types";
import { verifyContract } from "../verify/verify";
import { deployParams } from "./testnet";

(async () => {
  const networkId = (await ethers.provider.getNetwork()).chainId;
  console.log(`Network: ${networkId}`);

  const params = deployParams[networkId];
  if (!params) {
    throw new Error(`No deploy params for network ${networkId}`);
  }

  const [signer] = await ethers.getSigners();

  const gateway = "0x53B309Ff259e568309A19810E3bF1647B6922afd";

  if (!params.abacusConnectionManager || !params.abacusInterchainGasMaster) {
    throw new Error("Abacus Connection Manager or Abacus Interchain Gas Master not set");
  }

  const AbacusAdaptor = await new AbacusAdapter__factory(signer).deploy(
    gateway,
    params.pauser,
    params.abacusConnectionManager,
    params.abacusInterchainGasMaster
  );

  await AbacusAdaptor.deployed();
  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log(`AbacusAdaptor: ${AbacusAdaptor.address}`);

  await verifyContract(AbacusAdaptor.address, [
    gateway,
    params.pauser,
    params.abacusConnectionManager,
    params.abacusInterchainGasMaster,
  ]);
})();
