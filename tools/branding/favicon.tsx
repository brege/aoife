import { GiFilmStrip } from 'react-icons/gi';
import { GrAdd } from 'react-icons/gr';
import { PiBookOpenTextLight, PiMusicNotesFill } from 'react-icons/pi';
import './favicon.css';

const Favicon = () => {
  return (
    <div className="favicon" aria-hidden="true">
      <PiMusicNotesFill className="favicon-icon favicon-icon-music" />
      <PiBookOpenTextLight className="favicon-icon favicon-icon-books" />
      <GiFilmStrip className="favicon-icon favicon-icon-movies" />
      <GrAdd className="favicon-icon favicon-icon-add" />
    </div>
  );
};

export default Favicon;
