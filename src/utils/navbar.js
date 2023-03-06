import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Link } from 'react-router-dom';
import NavDropdown from 'react-bootstrap/NavDropdown';

function NavBarCustom() {
    return (
        <Navbar bg="light" expand="lg">
            <Container>
                <Navbar.Brand href="#home">Meditation Maps</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={Link} to="/validate">Load</Nav.Link>
                        <Nav.Link as={Link} to="/map">Map</Nav.Link>
                        <Nav.Link as={Link} to="/graphs">Graphs</Nav.Link>
{/* 
                        <NavDropdown title="Dropdown" id="basic-nav-dropdown">
                            <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.2">
                                Another action
                            </NavDropdown.Item>
                            <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item href="#action/3.4">
                                Separated link
                            </NavDropdown.Item>
                        </NavDropdown> */}

                    </Nav>
                </Navbar.Collapse>
                <Navbar.Text id="loginElement" style={{display: "none"}}>
                    Signed in as: <a style={{marginLeft: "10px"}} id="loginName" href="#login">(Default)</a>
                </Navbar.Text>
            </Container>
        </Navbar>
    );
}

export default NavBarCustom