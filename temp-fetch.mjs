const url = 'https://testnet.nexus.oasis.io/v1/sapphire/events?limit=5&contract_address=0xdb0f89037d12be69a7c33d46986c13ef488de1e3';
const run = async () => {
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data.events[0], null, 2));
};
run();
