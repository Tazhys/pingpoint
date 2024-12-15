# PingPoint

**PingPoint** is a Discord bot designed to provide insights into Plutonium servers. It offers real-time server statistics, player information, and GeoIP lookups. With a focus on server monitoring, player details, and game insights.

## Features

- **Server Information**: Fetch detailed information about Plutonium servers, including:
  - IP Address
  - Port
  - Game Type
  - Map Details
  - Player Stats
  - Server Revision
- **Statistics**: Get an overview of the most popular games, maps, and game types on Plutonium servers.
- **Player Insights**: List online players with their ping stats.
- **GeoIP Lookup**: Perform GeoIP lookups for server IP addresses to identify geographical details.

## Commands

### Slash Commands
- **/serverinfo**: Get information about a specific server.
  - **Options**:
    - `servername`: The name of the server (autocomplete enabled).
- **/stats**: Fetch statistics for all Plutonium servers.

### Buttons
- **GeoIP Lookup**: Perform a GeoIP lookup for the server’s IP address.
- **List Online Players**: Display a list of currently online players with their ping stats.

### Caching
PingPoint refreshes the server cache every 5 minutes to ensure up-to-date information.

## Support
If you encounter any issues or have questions, please [open an issue](https://github.com/tazhys/pingpoint/issues).

## Acknowledgements
- **[Discord.js](https://discord.js.org/)**: The library used for building the bot.
- **[Plutonium API](https://plutonium.pw/)**: The primary data source for server information.
- **[asimpleapi.com](https://geoip.asimpleapi.com/)**: GeoIP data provider.

## Contributing
1. Fork the repository.
2. Create a new branch for your feature/bugfix.
3. Submit a pull request with a detailed description.

## License
This project is licensed under the [MIT License](LICENSE).
