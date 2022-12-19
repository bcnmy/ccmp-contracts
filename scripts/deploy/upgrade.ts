import { ethers } from 'hardhat';
import {
  CCMPConfigurationFacet__factory,
  DiamondCutFacet,
  CCMPReceiverMessageFacet__factory,
  CCMPSendMessageFacet__factory,
  DiamondCutFacet__factory,
  DiamondLoupeFacet__factory,
} from '../../typechain-types';
import { deployCreate3, getSelectors } from './utils';
import { verifyContract } from '../verify/verify';
import type { Contract } from 'ethers';
import { FacetCutAction } from './utils';
import { getDeployerInstance } from './deploy-metadeployer';
import { DEPLOYMENT_SALTS } from './deployment-salt';

const factory = {
  configuration: CCMPConfigurationFacet__factory,
  receiveMessage: CCMPReceiverMessageFacet__factory,
  sendMessage: CCMPSendMessageFacet__factory,
};

const salt = {
  configuration: DEPLOYMENT_SALTS.CCMPConfigurationFacet,
  receiveMessage: DEPLOYMENT_SALTS.CCMPReceiverMessageFacet,
  sendMessage: DEPLOYMENT_SALTS.CCMPSendMessageFacet,
};

const registerFacet = async (diamond: DiamondCutFacet, facets: Contract[]) => {
  const existingFacets = await DiamondLoupeFacet__factory.connect(
    diamond.address,
    diamond.signer
  ).facets();
  const existingFuctionSelectors = existingFacets
    .map((f) => f.functionSelectors)
    .reduce((a, b) => [...a, ...b]);

  const facetCuts = facets
    .map((facet) => [
      {
        facetAddress: facet.address,
        action: FacetCutAction.Replace,
        functionSelectors: getSelectors(facet).filter((f) => existingFuctionSelectors.includes(f)),
      },
      {
        facetAddress: facet.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(facet).filter((f) => !existingFuctionSelectors.includes(f)),
      },
    ])
    .reduce((a, b) => [...a, ...b])
    .filter((f) => f.functionSelectors.length > 0);
  console.log(`Executing FacetCuts: ${JSON.stringify(facetCuts, null, 2)}`);
  try {
    const { hash, wait } = await diamond.diamondCut(facetCuts, ethers.constants.AddressZero, '0x');
    console.log(`DiamondCut tx hash: ${hash}`);
    const { status } = await wait();
    if (status) {
      console.log(`DiamondCut tx successful`);
    } else {
      throw new Error(`DiamondCut tx failed`);
    }
  } catch (e) {
    const errorData =
      (e as any).error?.data ||
      (e as any).error?.error?.data ||
      (e as any).error?.error?.error?.data;
    if (errorData) {
      const error = diamond.interface.parseError(errorData);
      console.log(error);
    }
  }
};

const deployFacet = async (name: keyof typeof factory): Promise<Contract> => {
  const signer = (await ethers.getSigners())[0];
  console.log(`Deploying ${name} facet...`);
  const deployer = await getDeployerInstance(true);
  const facetAddres = await deployCreate3(
    deployer.address,
    salt[name],
    new factory[name](signer),
    [],
    `${name}-facet`,
    true
  );
  const facet = factory[name].connect(facetAddres, signer);
  console.log(`Deployed ${name} facet at ${facet.address}`);
  setTimeout(() => verifyContract(facet.address, []), 20000);
  return facet;
};

(async () => {
  const diamondAddress = process.env.DIAMOND;
  if (!diamondAddress) {
    throw new Error('Diamond address not set');
  }
  const upgradeItems = process.env.UPGRADE?.split(',') || [];
  if (!upgradeItems.length) {
    throw new Error('No upgrade items specified');
  }

  const facets = [];
  for (const item of upgradeItems) {
    const facet = await deployFacet(item as keyof typeof factory);
    facets.push(facet);
  }

  await registerFacet(
    DiamondCutFacet__factory.connect(diamondAddress, (await ethers.getSigners())[0]),
    facets
  );
})();
